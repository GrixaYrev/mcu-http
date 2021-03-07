#pragma once

#include <stdint.h>
#include <string.h>
#include <stdlib.h>

#include "methods.h"


#define MCU_HTTP_LINE_MAX_LENGTH    (160)
#define MCU_HTTP_PATH_MAX_LENGTH    (80)


typedef void (*v_MH_PrintF_t)(uint8_t * format, ...);

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


typedef int32_t (*i32_MH_BodyProcess_t)(void * user_data, uint32_t offset, uint8_t * data, uint32_t length);


typedef struct
{
  uint32_t              Count;
  i32_MH_BodyProcess_t  Process;
  void *                UserData;

} MH_Body_t;


typedef struct
{
  v_MH_PrintF_t       PrintF;
  MH_Line_t           Line;
  MH_RxState_t        RxState;
  MH_Request_t        Request;
  MH_Body_t           Body;

} MHS_t;



#define  MH_NAME_AND_LENGTH(_name_)    _name_, ((uint32_t)(sizeof(_name_) - 1))


int32_t i32_MH_ReceiveLine(MH_Line_t * line, uint8_t * data, uint32_t length);

int32_t i32_MH_ParseHeaderLine(MH_Headers_t * headers, MH_Line_t * line);
void v_MH_HeaderDefault(MH_Headers_t * headers);


int32_t i32_MHS_OnReceive(MHS_t * server, uint8_t * data, uint32_t length);
int32_t i32_MHS_Init(MHS_t * server, v_MH_PrintF_t log_printf);

