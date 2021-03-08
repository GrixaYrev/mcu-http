
#include <string.h>

#include "http.h"



static int32_t i32_MHS_ParseStartLine(MH_Connection_t * connection)
{
  uint8_t * line = connection->Line.Data;
  uint32_t cursor = 0;

  MH_Method_t method = MH_Method_LastIndex;
  for (uint32_t i = 0; i < MH_Method_LastIndex; i++)
  {
    if (0 == strncmp(MH_MethodTable[i].Name, &line[cursor], MH_MethodTable[i].NameLength))
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
  cursor += MH_MethodTable[method].NameLength + 1;
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

  {
    uint8_t buf[256];
    uint32_t cnt = ((sizeof(buf) - 1) > connection->Line.Length) ? connection->Line.Length : (sizeof(buf) - 1);
    strncpy(buf, connection->Line.Data, cnt);
    buf[cnt] = '\0';
    MH_TRACE("Parse string: \"%s\"\n", buf);
  }

  switch (connection->RxState)
  {
    case MH_RxState_Reset:
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
        v_MH_HeaderDefault(&connection->Request.Headers);
        v_MH_HeaderDefault(&connection->Response.Headers);
        connection->RxState = MH_RxState_HeaderLines;
      }
      break;
    
    case MH_RxState_HeaderLines:
      if (connection->Line.Length == 0)
      {
        MH_TRACE("Content-Length: %d\n", connection->Request.Headers.ContentLength);
        if (connection->RequestExecute != NULL)
        {
          ret = connection->RequestExecute(connection);
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



int32_t i32_MH_OnReceive(MH_Connection_t * connection, uint8_t * data, uint32_t length)
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
      if (connection->Stream.Write != NULL)
      {
        result = connection->Stream.Write(connection->Stream.UserData, &data[count], remaining);
        if (result < 0)
        {
          // TODO: могут быть разные коды ответа
          connection->Response.Code = 500;
          connection->RxState = MH_RxState_Finish;
          result = -1; // TODO: Коды возврата
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
    // TODO: учитывать возможность ошибки записи и тогда код ответа будет не 200
    if ((connection->Response.Code == 200) 
      && (connection->Request.Headers.ContentLength > 0))
    {
      if (connection->Stream.Close != NULL)
      {
        connection->Stream.Close(connection->Stream.UserData);
      }
    } 

    // ответ
    MH_TRACE("Send response: %d %s (%d bytes)\n", connection->Response.Code, \
                                                  s_MH_GetResponseTextByCode(connection->Response.Code), \
                                                  connection->Response.Headers.ContentLength);
    
    result = i32_MH_SendResponseHeader(connection);

    // если нужено, тело ответа
    if (connection->Response.Headers.ContentLength > 0)
    {
      if ((connection->Stream.Read == NULL) || (connection->Transmitter.Send == NULL))
      {
        result = MH_RC_INVALARG;
      }
      else
      {
        uint8_t * buf = connection->Transmitter.Buffer;
        uint32_t buf_size = connection->Transmitter.BufferSize;
        uint32_t sent = 0;
        // сразу проверка на успех отправки заголовка
        while ((result >= 0) && (sent < connection->Response.Headers.ContentLength))
        {
          uint32_t remaining = connection->Response.Headers.ContentLength - sent;
          uint32_t count = (buf_size > remaining) ? remaining : buf_size;
          result = connection->Stream.Read(connection->Stream.UserData, buf, count);
          if (result > 0)
          {
            result = connection->Transmitter.Send(connection->Transmitter.UserData, buf, count);
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

      // закрываем поток в конце
      if (connection->Stream.Close != NULL)
      {
        connection->Stream.Close(connection->Stream.UserData);
      }
    }

    // закончили, можем снова принимать
    connection->RxState == MH_RxState_Reset;

    // но если не KeepAlive, то разрваем
    if (connection->Response.Headers.Connection != MH_HeaderConnection_KeepAlive)
    {
      result = MH_RC_CLOSE;
    }
  }

  return result;
}


int32_t i32_MH_InitServer(MH_Connection_t * connection, i32_MH_ReqExec_t request_execute, 
                                                        MH_Transmitter_t * transmitter)
{
  if (connection == NULL)
    return MH_RC_INVALARG;

  if (request_execute == NULL)
    return MH_RC_INVALARG;

  if (transmitter == NULL)
    return MH_RC_INVALARG;

  if (transmitter->Send == NULL)
    return MH_RC_INVALARG;

  if ((transmitter->Buffer == NULL) || (transmitter->BufferSize == 0))
    return MH_RC_INVALARG;


  connection->Type = MH_ConnectionType_Server;
  connection->Line.State = MH_LineState_Reset;
  connection->RxState = MH_RxState_Reset;
  connection->RequestExecute = request_execute;
  connection->Transmitter = *transmitter;
  connection->BodyCount = 0;

  return MH_RC_OK;
}
