
#include "http.h"



int32_t i32_MH_SetStream(MH_Connection_t * connection, MH_Stream_t * stream)
{
  if (connection == NULL)
  {
    return -1; // TODO: Коды возврата
  }

  connection->Stream = *stream;
  return 0;
}
