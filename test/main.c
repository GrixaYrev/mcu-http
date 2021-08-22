
#define WIN32_LEAN_AND_MEAN

#include <windows.h>
#include <winsock2.h>
#include <ws2tcpip.h>
#include <stdlib.h>
#include <stdio.h>
#include <stdint.h>
#include <stdbool.h>

#include "../http.h"


typedef struct
{
  FILE * file;
  SOCKET socket;

} Main_Connection_t;



static int32_t i32_Main_AfterRequest(MH_Connection_t * connection)
{
  fprintf(stdout, "Request: \"%s %s\"\n", s_MH_GetMethodName(connection->Request.Method), connection->Request.Path);
  uint8_t path[128];
  snprintf(path, sizeof(path), "./test_web%s", connection->Request.Path);
  fprintf(stdout, "File: %s\n", path);

  Main_Connection_t * web = (Main_Connection_t *)connection->UserData;

  web->file = NULL;
  if (connection->Request.Method == MH_Method_GET)
  {
    web->file = fopen(path, "rb");
    if (web->file != NULL)
    {
      // для GET надо прописать размер файла
      fseek(web->file, 0, SEEK_END);
      int32_t size = ftell(web->file);
      if (size < 0)
      {
        connection->Response.Headers.ContentLength = 0;
      }
      else
      {
        connection->Response.Headers.ContentLength = size;
      }
      // возвращаем указатель в начало
      fseek(web->file, 0, SEEK_SET);
    }
  }
  else if (connection->Request.Method == MH_Method_POST)
  {
    if (0 == strncmp("./test_web/post/", path, sizeof("./test_web/post/") - 1))
    {
      web->file = fopen(path, "wb");
    }
  }

  if (web->file == NULL)
  {
    return i32_MH_ReturnWithCode(connection, 404);
  }
  
  fprintf(stdout, "Open file 0x%08X\n", web->file);

  return i32_MH_ReturnWithCode(connection, 200);
}

static int32_t i32_Main_WriteRequestBody(MH_Connection_t * connection, uint8_t * data, uint32_t count)
{
  Main_Connection_t * web = (Main_Connection_t *)connection->UserData;
  fprintf(stdout, "Write %d bytes to file 0x%08X\n", count, web->file);
  return fwrite(data, 1, count, web->file);
}

static int32_t i32_Main_AfterRequestBody(MH_Connection_t * connection)
{
  Main_Connection_t * web = (Main_Connection_t *)connection->UserData;
  fprintf(stdout, "Close file 0x%08X (req)\n", web->file);
  int32_t ret = fclose(web->file);  
  return ret;
}

static int32_t i32_Main_ReadResponseBody(MH_Connection_t * connection, uint8_t * buffer, uint32_t count)
{
  Main_Connection_t * web = (Main_Connection_t *)connection->UserData;
  fprintf(stdout, "Read %d bytes from file 0x%08X\n", count, web->file);
  return fread(buffer, 1, count, web->file);
}

static int32_t i32_Main_AfterResponseBody(MH_Connection_t * connection)
{
  Main_Connection_t * web = (Main_Connection_t *)connection->UserData;
  fprintf(stdout, "Close file 0x%08X (res)\n", web->file);
  int32_t ret = fclose(web->file);  
  return ret;
}

static int32_t i32_Main_Send(MH_Connection_t * connection, uint8_t * data, uint32_t count)
{
  Main_Connection_t * web = (Main_Connection_t *)connection->UserData;
  int32_t ret = send(web->socket, data, count, 0);
  if (ret == SOCKET_ERROR)
  {
    fprintf(stderr, "send failed with error: %d\n", WSAGetLastError());
  }
  return ret;
}

static int32_t i32_Main_Recv(MH_Connection_t * connection, uint8_t * buffer, uint32_t buffer_size)
{
  Main_Connection_t * web = (Main_Connection_t *)connection->UserData;
  int32_t ret = recv(web->socket, buffer, buffer_size, 0);
  if (ret == SOCKET_ERROR)
  {
    fprintf(stderr, "send failed with error: %d\n", WSAGetLastError());
  }
  return ret;
}


const MH_Callbacks_t mh_callbacks = {
  
  .AfterRequest       = i32_Main_AfterRequest,
  .WriteRequestBody   = i32_Main_WriteRequestBody,
  .AfterRequestBody   = i32_Main_AfterRequestBody,
  .ReadResponseBody   = i32_Main_ReadResponseBody,
  .AfterResponseBody  = i32_Main_AfterResponseBody,
  .Send               = i32_Main_Send,
  .Recv               = i32_Main_Recv,
};

static uint8_t recvbuf[256];

int32_t connsection_work(SOCKET connection)
{
  MH_Connection_t mhs;
  Main_Connection_t web = {.socket = connection};

  int32_t ret = i32_MH_ConnectionWork(&mhs, &web, &mh_callbacks, recvbuf, sizeof(recvbuf));

  if (ret == MH_RC_RECVERROR)
  {
    fprintf(stderr, "WSAStartup failed with error: %d\n", WSAGetLastError());
  }

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