
#include "http.h"


typedef int32_t (*i32_MH_HeaderParse_t)(MH_Headers_t * headers, MH_Line_t * line, uint32_t offset);
typedef int32_t (*i32_MH_HeaderAdd_t)(MH_Headers_t * headers, uint8_t * buffer, uint32_t buffer_size, const uint8_t * name);

typedef struct
{
  const uint8_t *       Name;
  uint32_t              NameLength;
  i32_MH_HeaderParse_t  Parse;
  i32_MH_HeaderAdd_t    Add;

} MH_HeaderTable_t;


// =========== Content-Length ===========

static int32_t i32_MH_ContentLengthParse(MH_Headers_t * headers, MH_Line_t * line, uint32_t offset)
{
  headers->ContentLength = atoi(&line->Data[offset]);
  return 0;
}

static int32_t i32_MH_ContentLengthAdd(MH_Headers_t * headers, uint8_t * buffer, uint32_t buffer_size, const uint8_t * name)
{
  if (headers->ContentLength > 0)
  {
    return snprintf(buffer, buffer_size, "%s %u\r\n", name, headers->ContentLength);
  }
  return 0;
}


// =========== Connection ===========

static int32_t i32_MH_ConnectionParse(MH_Headers_t * headers, MH_Line_t * line, uint32_t offset)
{
  // пока не реализовано
  return 0;
}

static int32_t i32_MH_ConnectionAdd(MH_Headers_t * headers, uint8_t * buffer, uint32_t buffer_size, const uint8_t * name)
{
  if (headers->Connection == MH_HeaderConnection_Close)
  { 
    // по-простому сделаем, так как по-умолчанию KeepAlive
    return snprintf(buffer, buffer_size, "%s close\r\n", name);
  }
  return 0;
}


// =========== Content-Type ===========

static const uint8_t * const MH_HeaderContentTypeName[MH_HeaderContentType_LastIndex] = {

  "text/html",
  "text/plain",
  "image/png",
  "image/jpeg",
  "application/json",
  "application/octet-stream",

};

static int32_t i32_MH_ContentTypeParse(MH_Headers_t * headers, MH_Line_t * line, uint32_t offset)
{
  headers->ContentType = MH_HeaderContentType_LastIndex;

  for (int32_t i = 0; i < MH_HeaderContentType_LastIndex; i++)
  {
    if (NULL != strstr(&line->Data[offset], MH_HeaderContentTypeName[i]))
    {
      headers->ContentType = i;
      break;
    }
  }

  return 0;
}

static int32_t i32_MH_ContentTypeAdd(MH_Headers_t * headers, uint8_t * buffer, uint32_t buffer_size, const uint8_t * name)
{
  if (headers->ContentType < MH_HeaderContentType_LastIndex)
  {
    return snprintf(buffer, buffer_size, "%s %s\r\n", name, MH_HeaderContentTypeName[headers->ContentType]);
  }
  return 0;
}

// =========== Content-Encoding ===========

static int32_t i32_MH_ContentEncodingAdd(MH_Headers_t * headers, uint8_t * buffer, uint32_t buffer_size, const uint8_t * name)
{
  if (headers->ContentEncoding == MH_HeaderContentEncoding_gzip)
  { 
    // по-простому сделаем
    return snprintf(buffer, buffer_size, "%s gzip\r\n", name);
  }
  return 0;
}


static const MH_HeaderTable_t MH_HeaderTable[] = {

  {MH_NAME_AND_LENGTH("Content-Length:"),   i32_MH_ContentLengthParse,      i32_MH_ContentLengthAdd},
  {MH_NAME_AND_LENGTH("Content-Type:"),     i32_MH_ContentTypeParse,        i32_MH_ContentTypeAdd},
  {MH_NAME_AND_LENGTH("Content-Encoding:"), NULL,                           i32_MH_ContentEncodingAdd},
  {MH_NAME_AND_LENGTH("Connection:"),       i32_MH_ConnectionParse,         i32_MH_ConnectionAdd},
};

#define MH_HEADERS_TABLE_SIZE   (sizeof(MH_HeaderTable) / sizeof(MH_HeaderTable[0]))


int32_t i32_MH_ParseHeaderLine(MH_Headers_t * headers, MH_Line_t * line)
{
  for (uint32_t i = 0; i < MH_HEADERS_TABLE_SIZE; i++)
  {
    if (MH_HeaderTable[i].Parse != NULL)
    {
      if (0 == strncmp(MH_HeaderTable[i].Name, line->Data, MH_HeaderTable[i].NameLength))
      {
        return MH_HeaderTable[i].Parse(headers, line, MH_HeaderTable[i].NameLength);
      }
    }
  }
  // если не нашли, то ничего страшного
  return 0;
}

int32_t i32_MH_GetHeaderTableSize(void)
{
  return MH_HEADERS_TABLE_SIZE;
}

int32_t i32_MH_WriteHeaderLine(MH_Headers_t * headers, uint8_t * buffer, uint32_t buffer_size, uint32_t header_index)
{
  if (header_index < MH_HEADERS_TABLE_SIZE)
  {
    return MH_HeaderTable[header_index].Add(headers, buffer, buffer_size, MH_HeaderTable[header_index].Name);
  }

  return 0;
}

void v_MH_HeaderDefault(MH_Headers_t * headers)
{
  headers->ContentLength = 0;
  headers->Connection = MH_HeaderConnection_Close;
  headers->ContentType = MH_HeaderContentType_LastIndex;
  headers->ContentEncoding = MH_HeaderContentEncoding_None;
}