
#include "http.h"


typedef int32_t (*i32_MH_HeaderParse_t)(MH_Headers_t * headers, MH_Line_t * line, uint32_t offset);

typedef struct
{
  const uint8_t *       Name;
  uint32_t              NameLength;
  i32_MH_HeaderParse_t  Parse;

} MH_HeaderTable_t;


static int32_t i32_MH_ContentLengthParse(MH_Headers_t * headers, MH_Line_t * line, uint32_t offset)
{
  headers->ContentLength = atoi(&line->Data[offset]);
  return 0;
}

const MH_HeaderTable_t MH_HeaderTable[] = {

  {MH_NAME_AND_LENGTH("Content-Length:"), i32_MH_ContentLengthParse}
};

#define MH_HEADERS_TABLE_SIZE   (sizeof(MH_HeaderTable) / sizeof(MH_HeaderTable[0]))


int32_t i32_MH_ParseHeaderLine(MH_Headers_t * headers, MH_Line_t * line)
{
  for (uint32_t i = 0; i < MH_HEADERS_TABLE_SIZE; i++)
  {
    if (0 == strncmp(MH_HeaderTable[i].Name, line->Data, MH_HeaderTable[i].NameLength))
    {
      return MH_HeaderTable[i].Parse(headers, line, MH_HeaderTable[i].NameLength);
    }
  }
  // если не нашли, то ничего страшного
  return 0;
}

void v_MH_HeaderDefault(MH_Headers_t * headers)
{
  headers->ContentLength = 0;
}