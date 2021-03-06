
#include <string.h>

#include "http.h"

#include "stdio.h" // FIXME: Убрать все printf()


static int32_t i32_MHS_ParseStartLine(MHS_t * server)
{
  uint8_t * line = server->Line.Data;
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

    return -444; // TODO: коды возврата
  }

  server->Request.Method = method;

  // считываем путь
  cursor += MH_MethodTable[method].NameLength + 1;
  uint32_t path_length = 0;
  
  while ((line[cursor]  != ' ') 
      && (cursor < server->Line.Length)
      && (path_length < (MCU_HTTP_PATH_MAX_LENGTH - 1)))
  {
    server->Request.Path[path_length++] = line[cursor++];
  }
  server->Request.Path[path_length++] = '\0';

  // TODO: сделать проверку версии

  return 0; // TODO: коды возврата
}



static int32_t i32_MHS_ProcessLine(MHS_t * server)
{
  int32_t ret = 0; // TODO: коды возврата

  {
    uint8_t buf[256];
    uint32_t cnt = ((sizeof(buf) - 1) > server->Line.Length) ? server->Line.Length : (sizeof(buf) - 1);
    strncpy(buf, server->Line.Data, cnt);
    buf[cnt] = '\0';
    fprintf(stdout, "Parse string: \"%s\"\n", buf);
  }

  switch (server->RxState)
  {
    case MH_RxState_Reset:
      // разбираем стартовую строчку
      ret = i32_MHS_ParseStartLine(server);
      if (ret < 0)
      {
        server->RxState = MH_RxState_Error;
      }
      else
      {
        fprintf(stdout, "Method: %d\n", server->Request.Method);
        fprintf(stdout, "Path: %s\n", server->Request.Path);
        v_MH_HeaderDefault(&server->Headers);
        server->RxState = MH_RxState_HeaderLines;
      }
      break;
    
    case MH_RxState_HeaderLines:
      if (server->Line.Length == 0)
      {
        fprintf(stdout, "Content-Length: %d\n", server->Headers.ContentLength);
        // TODO: Обработка запроса, получение данных для обработки тела
        server->Body.Count = 0;
        server->RxState = (server->Headers.ContentLength > 0) ? MH_RxState_Body : MH_RxState_Finish;
      }
      else
      {
        ret = i32_MH_ParseHeaderLine(&server->Headers, &server->Line);
        if (ret < 0)
        {
          server->RxState = MH_RxState_Error;
        }
      }
      break;

    default:
      server->RxState = MH_RxState_Error;
  }

  return 0;
}



int32_t i32_MHS_OnReceive(MHS_t * server, uint8_t * data, uint32_t length)
{
  if (server == NULL)
  {
    return -1; // TODO: Коды возврата
  }
  
  if ((data == NULL) || (length == 0))
  {
    return -1; // TODO: Коды возврата
  }

  int32_t result = 0; // TODO: Коды возврата
  int32_t count = 0;

  while (count < length)
  {
    if ((server->RxState == MH_RxState_Reset)
      || (server->RxState == MH_RxState_HeaderLines))
    {
      result = i32_MH_ReceiveLine(&server->Line, &data[count], length - count);
      if (result < 0)
      {
        // TODO: Ответ клиенту
        break;
      }
      else
      {
        count += result;
        if (server->Line.State == MH_LineState_Reset)
        {
          result = i32_MHS_ProcessLine(server);
          if (result < 0)
          {
            // TODO: Ответ клиенту
            break;
          }
        }
      }
    }
    else if (server->RxState == MH_RxState_Body)
    {
      if (server->Body.Process != NULL)
      {
        result = server->Body.Process(server->Body.UserData, server->Body.Count, &data[count], length - count);
        if (result < 0)
        {
          // TODO: Ответ клиенту
          break;
        }
      }
      server->Body.Count += (length - count);
      count += (length - count);
      if (server->Body.Count >= server->Headers.ContentLength)
      {
        server->RxState = MH_RxState_Finish;
      }
    }
    else
    {
      // ошибка
      result = -1; // TODO: Коды возврата
    }
  }

  if (server->RxState == MH_RxState_Finish)
  {
    // прием закончен, надло отвечать
    fprintf(stdout, "Ready to response, body size: %d\n", server->Body.Count);
  }

  return result;
}


int32_t i32_MHS_Init(MHS_t * server)
{
  if (server == NULL)
  {
    return -1; // TODO: Коды возврата
  }

  server->Line.State = MH_LineState_Reset;
  server->RxState = MH_RxState_Reset;
  server->Body.Process = NULL;

  return 0;
}
