
#include <string.h>

#include "http.h"



static int32_t i32_MHS_ParseStartLine(MH_Connection_t * connection)
{
  uint8_t * line = connection->Line.Data;
  uint32_t cursor = 0;

  MH_Method_t method = MH_Method_LastIndex;
  for (uint32_t i = 0; i < MH_Method_LastIndex; i++)
  {
    if (0 == strncmp(s_MH_GetMethodName(i), &line[cursor], u32_MH_GetMethodNameLength(i)))
    {
      method = (MH_Method_t)i;
      break;
    }
  }

  if (method == MH_Method_LastIndex)
  {
    // неизвестный метод
    connection->Response.Code = 501;
    return MH_RC_NOT200;
  }

  connection->Request.Method = method;

  // считываем путь
  cursor +=  u32_MH_GetMethodNameLength(method) + 1;
  uint32_t path_length = 0;
  
  while ((line[cursor]  != ' ') 
      && (cursor < connection->Line.Length)
      && (path_length < (MCU_HTTP_PATH_MAX_LENGTH - 1)))
  {
    connection->Request.Path[path_length++] = line[cursor++];
  }

  // если заканчивается на '/', то надо добавить index.html
  if (connection->Request.Path[path_length - 1] == '/')
  {
    if (path_length + sizeof("index.html") < MCU_HTTP_PATH_MAX_LENGTH)
    {
      // ноль в строке учтен, так что просто копируем
      strcpy(&connection->Request.Path[path_length], "index.html");
      path_length += sizeof("index.html");
    }
    else
    {
      // ошибка
      connection->Response.Code = 414;
      return MH_RC_NOT200;
    }
  }
  else
  {
    // если 'index.html' не добавляем, то ноль сами прописываем
    connection->Request.Path[path_length++] = '\0';
  }

  int32_t ret = i32_MH_ParseParametersInURL(&connection->Request);
  if (ret < 0)
  {
    return ret;
  }

  // TODO: сделать проверку версии

  return MH_RC_OK;
}



static int32_t i32_MHS_ProcessLine(MH_Connection_t * connection)
{
  int32_t ret = MH_RC_OK;

#ifdef __MINGW32__
  {
    uint8_t buf[256];
    uint32_t cnt = ((sizeof(buf) - 1) > connection->Line.Length) ? connection->Line.Length : (sizeof(buf) - 1);
    strncpy(buf, connection->Line.Data, cnt);
    buf[cnt] = '\0';
    MH_TRACE("Parse string: \"%s\"\n", buf);
  }
#endif

  switch (connection->RxState)
  {
    case MH_RxState_Reset:
      v_MH_HeaderDefault(&connection->Request.Headers);
      v_MH_HeaderDefault(&connection->Response.Headers);
      // разбираем стартовую строчку
      ret = i32_MHS_ParseStartLine(connection);
      if (ret == MH_RC_NOT200)
      {
        // отвечаем, код ответа должен уже быть прописан
        connection->RxState = MH_RxState_Finish;
      }
      else if (ret < 0)
      {
        connection->RxState = MH_RxState_Error;
      }
      else
      {
        MH_TRACE("Method: %s\n", s_MH_GetMethodName(connection->Request.Method));
        MH_TRACE("Path: %s\n", connection->Request.Path);
        if (connection->Request.ParametersCount > 0)
        {
          MH_TRACE("Parameters:\n");
          for (uint32_t i = 0; i < connection->Request.ParametersCount; i++)
          {
            MH_TRACE("\t%s = %s\n", connection->Request.Parameters[i].Name,\
                                    connection->Request.Parameters[i].Value);
          }
        }
        connection->RxState = MH_RxState_HeaderLines;
      }
      break;
    
    case MH_RxState_HeaderLines:
      if (connection->Line.Length == 0)
      {
        MH_TRACE("Content-Length: %d\n", connection->Request.Headers.ContentLength);
        if (connection->Callbacks.AfterRequest != NULL)
        {
          ret = connection->Callbacks.AfterRequest(connection);
          if (ret == MH_RC_NOT200)
          {
            // код уже прописан
            connection->RxState = MH_RxState_Finish;  
          }
          else if (ret < 0)
          {
            // отвечаем ошибкой
            connection->Response.Code = 500;
            connection->RxState = MH_RxState_Finish;
          }
          else
          {
            connection->RxState = (connection->Request.Headers.ContentLength > 0) ? MH_RxState_Body : MH_RxState_Finish;
          }
        }
        else
        {
          // отвечаем ошибкой
          connection->Response.Code = 500;
          connection->RxState = MH_RxState_Finish;
        }
      }
      else
      {
        ret = i32_MH_ParseHeaderLine(&connection->Request.Headers, &connection->Line);
        if (ret < 0)
        {
          connection->RxState = MH_RxState_Error;
        }
      }
      break;

    default:
      connection->RxState = MH_RxState_Error;
  }

  return MH_RC_OK;
}


static int32_t i32_MH_SendResponse(MH_Connection_t * connection, uint8_t * buffer, uint32_t buffer_size)
{
  // ответ
  MH_TRACE("Send response: %d %s (%d bytes)\n", connection->Response.Code, \
                                                s_MH_GetResponseTextByCode(connection->Response.Code), \
                                                connection->Response.Headers.ContentLength);

  int32_t result = i32_MH_SendResponseHeader(connection, buffer, buffer_size);

  // если нужно, тело ответа
  if (connection->Response.Headers.ContentLength > 0)
  {
    if ((connection->Callbacks.ReadResponseBody == NULL) || (connection->Callbacks.Send == NULL))
    {
      result = MH_RC_INVALARG;
    }
    else
    {
      uint32_t sent = 0;
      // сразу проверка на успех отправки заголовка
      while ((result >= 0) && (sent < connection->Response.Headers.ContentLength))
      {
        uint32_t remaining = connection->Response.Headers.ContentLength - sent;
        uint32_t count = (buffer_size > remaining) ? remaining : buffer_size;
        result = connection->Callbacks.ReadResponseBody(connection, buffer, count);
        if (result > 0)
        {
          result = connection->Callbacks.Send(connection, buffer, count);
          if (result != count)
          {
            result = MH_RC_SENDERROR;
          }
          else
          {
            sent += count;
          }
        }
      }
    }

    if (connection->Callbacks.AfterResponseBody != NULL)
    {
      connection->Callbacks.AfterResponseBody(connection);
    }
  }

  // закончили, можем снова принимать
  connection->RxState = MH_RxState_Reset;

  // но если не KeepAlive, то разрваем
  if (connection->Response.Headers.Connection != MH_HeaderConnection_KeepAlive)
  {
    if (result >= 0)
      result = MH_RC_CLOSE;
  }

  return result;
}


static int32_t i32_MH_OnReceive(MH_Connection_t * connection, uint8_t * data, uint32_t length)
{
  if (connection == NULL)
  {
    return MH_RC_INVALARG;
  }
  
  if ((data == NULL) || (length == 0))
  {
    return MH_RC_INVALARG;
  }

  int32_t result = MH_RC_OK;
  int32_t count = 0;

  while ((count < length) && (connection->RxState != MH_RxState_Finish))
  {
    uint32_t remaining = length - count;

    if ((connection->RxState == MH_RxState_Reset)
      || (connection->RxState == MH_RxState_HeaderLines))
    {
      result = i32_MH_ReceiveLine(&connection->Line, &data[count], remaining);
      if (result < 0)
      {
        connection->Response.Code = 400;
        connection->RxState = MH_RxState_Finish;
        break;
      }
      else
      {
        count += result;
        if (connection->Line.State == MH_LineState_Reset)
        {
          result = i32_MHS_ProcessLine(connection);
          if (result < 0)
          {
            // функция вернет ошибку, только если что-то серьезное
            // если код ответа определен, то будет MH_RC_OK
            // и эта ветка не нужна
            connection->Response.Code = 500;
            connection->RxState = MH_RxState_Finish;
            break;
          }
        }
      }
    }
    else if (connection->RxState == MH_RxState_Body)
    {
      if (connection->Callbacks.WriteRequestBody != NULL)
      {
        result = connection->Callbacks.WriteRequestBody(connection, &data[count], remaining);
        if (result != remaining)
        {
          connection->Response.Code = (result < 0) ? 500 : 413;
          connection->RxState = MH_RxState_Finish;
          result = MH_RC_WRITEERROR;
          break;
        }
      }
      else
      {
        connection->Response.Code = 500;
        connection->RxState = MH_RxState_Finish;
        result = MH_RC_INVALARG;
        break;
      }
      connection->BodyCount += remaining;
      count += remaining;
      if (connection->BodyCount >= connection->Request.Headers.ContentLength)
      {
        connection->RxState = MH_RxState_Finish;
      }
    }
    else
    {
      // ошибка, других состояний быть не должно
      result = MH_RC_FAULT;
      break;
    }
  }

  if (connection->RxState == MH_RxState_Finish)
  {
    // прием закончен, надо отвечать
    MH_TRACE("Ready to response, body size: %d\n", connection->BodyCount);
    // если было тело в запросе, надо закрыть поток
    if (connection->Request.Headers.ContentLength > 0)
    {
      if (connection->Callbacks.AfterRequestBody != NULL)
      {
        connection->Callbacks.AfterRequestBody(connection);
      }
    } 
  }

  return result;
}


int32_t i32_MH_ConnectionWork(MH_Connection_t * connection, void * user_data,
                                                            const MH_Callbacks_t * callbacks, 
                                                            uint8_t * buffer, uint32_t buffer_size)
{
  if (connection == NULL)
    return MH_RC_INVALARG;

  if (callbacks == NULL)
    return MH_RC_INVALARG;

  if ((buffer == NULL) || (buffer_size == 0))
    return MH_RC_INVALARG;

  connection->Type = MH_ConnectionType_Server;
  connection->Line.State = MH_LineState_Reset;
  connection->RxState = MH_RxState_Reset;
  connection->Callbacks = *callbacks;
  connection->BodyCount = 0;
  connection->Response.Headers.ContentLength = 0;
  connection->UserData = user_data;

  int32_t received;
  int32_t ret;
  do 
  {
    received = connection->Callbacks.Recv(connection, buffer, buffer_size);

    if (received > 0)
    {
      MH_TRACE("Received %d bytes\n", received);
      ret = i32_MH_OnReceive(connection, buffer, received);
      if (ret < 0)
      {
        MH_TRACE("Server receive error: %d\n", ret);
        if (connection->RxState != MH_RxState_Finish)
        {
          // разрываем соединение
          break;
        }
      }
      if (connection->RxState == MH_RxState_Finish)
      {
        ret = i32_MH_SendResponse(connection, buffer, buffer_size);
        if ((ret < 0) && (ret != MH_RC_CLOSE))
        {
          // разрываем соединение
          MH_TRACE("Server close connection: %d\n", ret);
          break;
        }
      }
    }
    else  
    {
      MH_TRACE("Socket closed: %d\n", ret);
      ret = MH_RC_RECVERROR;
    }

  } while (received > 0);

  // для корректного закрытия соединения
  if (connection->Callbacks.CloseConnection != NULL)
  {
    connection->Callbacks.CloseConnection(connection);
  }

  return ret;
}
