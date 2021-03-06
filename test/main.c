
#define WIN32_LEAN_AND_MEAN

#include <windows.h>
#include <winsock2.h>
#include <ws2tcpip.h>
#include <stdlib.h>
#include <stdio.h>
#include <stdint.h>
#include <stdbool.h>

#include "../http.h"


static uint8_t recvbuf[256];

int32_t connsection_work(SOCKET connection)
{
  MHS_t mhs;

  i32_MHS_Init(&mhs);

  int iResult;
  do 
  {
    iResult = recv(connection, recvbuf, sizeof(recvbuf), 0);

    if (iResult > 0)
    {
      fprintf(stdout, "Received %d bytes\n", iResult);
      i32_MHS_OnReceive(&mhs, recvbuf, iResult);
    }
    else if (iResult == 0)
    {
      fprintf(stdout, "Connection closing...\n");
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

    // сервер больше не нужен
    closesocket(server);

    fprintf(stdout, "Accepted client\n");

    connsection_work(connection);

    closesocket(connection);
    WSACleanup();
  }

  return 0;
}