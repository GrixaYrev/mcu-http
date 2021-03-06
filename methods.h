#pragma once

#include "stdint.h"


typedef enum
{
  MH_Method_GET = 0,
  MH_Method_POST,

  MH_Method_LastIndex

} MH_Method_t;



typedef struct
{
  const uint8_t * Name;
  uint32_t        NameLength;

} MH_MethodTable_t;

extern const MH_MethodTable_t MH_MethodTable[MH_Method_LastIndex];

