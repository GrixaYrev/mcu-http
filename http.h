#pragma once

#include <stdint.h>
#include <string.h>
#include <stdlib.h>
#include <stdbool.h>
#include <stdio.h>


#ifdef __MINGW32__
  #define MH_TRACE(...) printf(__VA_ARGS__)
#else
  #define MH_TRACE(...) 
#endif


#define MCU_HTTP_LINE_MAX_LENGTH      (160)
#define MCU_HTTP_PATH_MAX_LENGTH      (80)
#define MCU_HTTP_PARAMETERS_MAX_COUNT (4)


#define MH_RC_OK          ( 0)
#define MH_RC_INVALARG    (-1)
#define MH_RC_NOT200      (-2)
#define MH_RC_LINEERROR   (-3)
#define MH_RC_FAULT       (-4)
#define MH_RC_SENDERROR   (-5)
#define MH_RC_SMALLBUFFER (-6)
#define MH_RC_CLOSE       (-7)
#define MH_RC_WRITEERROR  (-8)


typedef enum
{
  MH_Method_GET = 0,
  MH_Method_POST,

  MH_Method_LastIndex

} MH_Method_t;


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
  uint8_t * Name;
  uint8_t * Value;

} MH_ParametersInURL_t;


typedef struct
{
  uint8_t               Path[MCU_HTTP_PATH_MAX_LENGTH];
  MH_Method_t           Method;
  MH_Headers_t          Headers;  
  uint32_t              ParametersCount;
  MH_ParametersInURL_t  Parameters[MCU_HTTP_PARAMETERS_MAX_COUNT];

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
  uint32_t                IsOpened;

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

inline static int32_t i32_MH_ReturnWithCode(MH_Connection_t * connection, uint32_t code)
{
  if (connection != NULL)
  {
    connection->Response.Code = code;
  }
  return (code == 200) ? MH_RC_OK : MH_RC_NOT200; 
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
uint32_t u32_MH_GetMethodNameLength(MH_Method_t method);

int32_t i32_MH_SetStream(MH_Connection_t * connection, MH_Stream_t * stream);
int32_t i32_MH_SetContentLength(MH_Connection_t * connection, uint32_t length);
int32_t i32_MH_ParseParametersInURL(MH_Request_t * request);


int32_t i32_MH_OnReceive(MH_Connection_t * connection, uint8_t * data, uint32_t length);
int32_t i32_MH_InitServer(MH_Connection_t * connection, i32_MH_ReqExec_t request_execute, 
                                                        MH_Transmitter_t * transmitter);

