
#define WIN32_LEAN_AND_MEAN

#include <windows.h>
#include <winsock2.h>
#include <ws2tcpip.h>
#include <stdlib.h>
#include <stdio.h>
#include <stdint.h>
#include <stdbool.h>

#include "../http.h"



int32_t i32_Main_ReadStream(void * user_data, uint8_t * buffer, uint32_t count)
{
  fprintf(stdout, "Read %d bytes from file 0x%08X\n", count, user_data);
  return fread(buffer, 1, count, (FILE *)user_data);
}

int32_t i32_Main_WriteStream(void * user_data, const uint8_t * buffer, uint32_t count)
{
  fprintf(stdout, "Write %d bytes to file 0x%08X\n", count, user_data);
  return fwrite(buffer, 1, count, (FILE *)user_data);
}

int32_t i32_Main_CloseStream(void * user_data, uint32_t * status_code)
{
  fprintf(stdout, "Close file 0x%08X\n", user_data);
  int32_t ret = fclose((FILE *)user_data);
  if (status_code != NULL)
  {
    *status_code = (ret < 0) ? 500 : 200;
  }
  
  return ret;
}


int32_t i32_Main_ReqExec(MH_Connection_t * connection)
{
  MH_Stream_t stream = {0};

  fprintf(stdout, "Request: \"%s %s\"\n", s_MH_GetMethodName(connection->Request.Method), connection->Request.Path);

  uint8_t path[128];
  snprintf(path, sizeof(path), "./test_site%s", connection->Request.Path);
  fprintf(stdout, "File: %s\n", path);


  FILE * handler = NULL;
  if (connection->Request.Method == MH_Method_GET)
  {
    handler = fopen(path, "rb");
    if (handler != NULL)
    {
      // для GET надо прописать размер файла
      fseek(handler, 0, SEEK_END);
      int32_t size = ftell(handler);
      if (size < 0)
      {
        connection->Response.Headers.ContentLength = 0;
      }
      else
      {
        connection->Response.Headers.ContentLength = size;
      }
      // возвращаем указатель в начало
      fseek(handler, 0, SEEK_SET);
    }
  }
  else if (connection->Request.Method == MH_Method_POST)
  {
    if (0 == strncmp("./test_site/post/", path, sizeof("./test_site/post/") - 1))
    {
      handler = fopen(path, "wb");
    }
  }

  if (handler == NULL)
  {
    return i32_MH_ReturnWithCode(connection, 404);
  }

  fprintf(stdout, "Open file 0x%08X\n", handler);

  stream.UserData = handler;
  stream.Read = i32_Main_ReadStream;
  stream.Write = i32_Main_WriteStream;
  stream.Close = i32_Main_CloseStream;

  i32_MH_SetStream(connection, &stream);

  return i32_MH_ReturnWithCode(connection, 200);
}



int32_t i32_Main_SocketSend(void * user_data, uint8_t * data, uint32_t count)
{
  int32_t ret = send((SOCKET)user_data, data, count, 0);
  if (ret == SOCKET_ERROR)
  {
    fprintf(stderr, "send failed with error: %d\n", WSAGetLastError());
  }
  return ret;
}

static uint8_t recvbuf[256];

int32_t connsection_work(SOCKET connection)
{
  MH_Connection_t mhs;
  MH_Transmitter_t tx = {.UserData = (void *)connection,
                         .Send = i32_Main_SocketSend,
                         .Buffer = recvbuf,
                         .BufferSize = sizeof(recvbuf)};

  i32_MH_InitServer(&mhs, i32_Main_ReqExec, &tx);

  int iResult;
  do 
  {
    iResult = recv(connection, recvbuf, sizeof(recvbuf), 0);

    if (iResult > 0)
    {
      fprintf(stdout, "Received %d bytes\n", iResult);
      int32_t ret = i32_MH_OnReceive(&mhs, recvbuf, iResult);
      if (ret < 0)
      {
        // разрываем соединение
        fprintf(stdout, "Server close connection\n");
        break;
      }
    }
    else if (iResult == 0)
    {
      fprintf(stdout, "Client close connection\n");
    }
    else  
    {
      fprintf(stderr, "recv failed with error: %d\n", WSAGetLastError());
    }

  } while (iResult > 0);

  return 0;
}



static WSADATA wsaData;

int main(void)
{
  printf("MCU-HTTP test\n");  

  int32_t res = WSAStartup(MAKEWORD(2,2), &wsaData);
  if (res != 0) {
      fprintf(stderr, "WSAStartup failed with error: %d\n", res);
      return -1;
  }

  SOCKET server;
  SOCKET connection;
  struct sockaddr_in service;
  service.sin_family = AF_INET;
  service.sin_addr.s_addr = inet_addr("127.0.0.1");
  service.sin_port = htons(27015);

  // создаем сокет
  if ((server = socket(PF_INET, SOCK_STREAM, IPPROTO_TCP)) == INVALID_SOCKET)
  {
    fprintf(stderr, "Socket create failed with error: %ld\n", WSAGetLastError());
  }
  else
  {
    int32_t iResult = bind(server, (SOCKADDR *) & service, sizeof (service));
    if (iResult == SOCKET_ERROR) 
    {
      fprintf(stderr, "bind function failed with error %d\n", WSAGetLastError());
      iResult = closesocket(server);
      if (iResult == SOCKET_ERROR)
          fprintf(stderr, "closesocket function failed with error %d\n", WSAGetLastError());
      WSACleanup();
      return -1;
    }

    do
    {  
      // слушаем
      iResult = listen(server, 1);
      if (iResult == SOCKET_ERROR) 
      {
        fprintf(stderr, "listen failed with error: %d\n", WSAGetLastError());
        closesocket(server);
        WSACleanup();
        return -1;
      }

      // получаем сокет подключения
      connection = accept(server, NULL, NULL);
      if (connection == INVALID_SOCKET) 
      {
        fprintf(stderr, "accept failed with error: %d\n", WSAGetLastError());
        closesocket(server);
        WSACleanup();
        return 1;
      }

      fprintf(stdout, "Accepted client\n");

      connsection_work(connection);

      closesocket(connection);

    } while (1);

    // сервер больше не нужен
    closesocket(server);

    WSACleanup();
  }

  return 0;
}