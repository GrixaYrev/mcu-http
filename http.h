#pragma once

#include <stdint.h>
#include <string.h>
#include <stdlib.h>

#include "methods.h"


#ifdef __MINGW32__
  #include <stdio.h>
  #define MH_TRACE(_format_, ...) printf(_format_, __VA_ARGS__)
#endif


#define MCU_HTTP_LINE_MAX_LENGTH    (160)
#define MCU_HTTP_PATH_MAX_LENGTH    (80)


typedef enum
{
  MH_RxState_Reset = 0,
  MH_RxState_HeaderLines,
  MH_RxState_Body,
  MH_RxState_Finish,
  MH_RxState_Error

} MH_RxState_t;

typedef enum
{
  MH_LineState_Reset = 0,
  MH_LineState_Content,
  MH_LineState_EOL

} MH_LineState_t;

typedef struct
{
  uint8_t         Data[MCU_HTTP_LINE_MAX_LENGTH];
  uint32_t        Length;
  MH_LineState_t  State;

} MH_Line_t;


typedef enum
{
  MH_HeaderConnection_Close = 0,
  MH_HeaderConnection_KeepAlive

} MH_HeaderConnection_t;

typedef struct
{
  uint32_t              ContentLength;
  MH_HeaderConnection_t Connection;

} MH_Headers_t;

typedef struct
{
  uint8_t       Path[MCU_HTTP_PATH_MAX_LENGTH];
  MH_Method_t   Method;
  MH_Headers_t  Headers;  

} MH_Request_t;

typedef struct
{
  MH_Headers_t  Headers; 
  uint32_t      Code; 

} MH_Response_t;


typedef int32_t (*i32_MH_WriteToStream_t)(void * user_data,
                                          const uint8_t * data, uint32_t count);
typedef int32_t (*i32_MH_ReadStream_t)(void * user_data, 
                                       uint8_t * buffer, uint32_t count);
typedef int32_t (*i32_MH_CloseStream_t)(void * user_data);


typedef struct
{
  void *                  UserData;
  i32_MH_WriteToStream_t  Write;
  i32_MH_ReadStream_t     Read;
  i32_MH_CloseStream_t    Close;

} MH_Stream_t;


typedef struct mh_conn_s MH_Connection_t;

typedef int32_t (*i32_MH_ReqExec_t)(MH_Connection_t * connection);
typedef int32_t (*i32_MH_Send_t)(void * user_data, uint8_t * data, uint32_t count);

typedef struct
{
  void *        UserData;
  i32_MH_Send_t Send;
  uint8_t *     Buffer;
  uint32_t      BufferSize;

} MH_Transmitter_t;


typedef enum
{
  MH_ConnectionType_Server = 0,
  MH_ConnectionType_Client

} MH_ConnectionType_t;

typedef struct mh_conn_s
{
  MH_ConnectionType_t Type;
  MH_Line_t           Line;
  MH_RxState_t        RxState;
  MH_Request_t        Request;
  MH_Response_t       Response;
  uint32_t            BodyCount;
  void *              UserData;
  i32_MH_ReqExec_t    RequestExecute;
  MH_Stream_t         Stream;
  MH_Transmitter_t    Transmitter;

} MH_Connection_t;



#define  MH_NAME_AND_LENGTH(_name_)    _name_, ((uint32_t)(sizeof(_name_) - 1))

inline static void v_MH_SetResponseCode(MH_Connection_t * connection, uint32_t code)
{
  if (connection != NULL)
  {
    connection->Response.Code = code;
  }
}


int32_t i32_MH_ReceiveLine(MH_Line_t * line, uint8_t * data, uint32_t length);

int32_t i32_MH_ParseHeaderLine(MH_Headers_t * headers, MH_Line_t * line);
int32_t i32_MH_GetHeaderTableSize(void);
int32_t i32_MH_WriteHeaderLine(MH_Headers_t * headers, uint8_t * buffer, uint32_t buffer_size, 
                                                                         uint32_t header_index);
void v_MH_HeaderDefault(MH_Headers_t * headers);

const uint8_t * s_MH_GetResponseTextByCode(uint32_t code);
int32_t i32_MH_SendResponseHeader(MH_Connection_t * connection);

const uint8_t * s_MH_GetMethodName(MH_Method_t method);

int32_t i32_MH_SetStream(MH_Connection_t * connection, MH_Stream_t * stream);


int32_t i32_MH_OnReceive(MH_Connection_t * connection, uint8_t * data, uint32_t length);
int32_t i32_MH_InitServer(MH_Connection_t * connection, i32_MH_ReqExec_t request_execute, 
                                                        MH_Transmitter_t * transmitter);

