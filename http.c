
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


int32_t i32_MH_ParseParametersInURL(MH_Request_t * request)
{
  if (request == NULL)
  {
    return -1; // TODO: Коды возврата 
  }

  request->ParametersCount = 0;

  uint8_t * cursor = request->Path;
  uint32_t count = 0; // дополнительная проверка, не особо нужна

  enum {state_reset, state_name, state_value} state = state_reset;

  while ((*cursor != '\0') && (count < MCU_HTTP_PATH_MAX_LENGTH)
       && (request->ParametersCount < MCU_HTTP_PARAMETERS_MAX_COUNT))
  {
    if (state == state_reset)
    {
      if (*cursor == '?')
      {
        *cursor = '\0';
        request->Parameters[request->ParametersCount].Name = cursor + 1;
        state = state_name;
      }
    }
    else if (state == state_name)
    {
      if (*cursor == '=')
      {
        *cursor = '\0';
        request->Parameters[request->ParametersCount].Value = cursor + 1;
        request->ParametersCount++;
        state = state_value;
      }
    }
    else /* state == state_value */
    {
      if (*cursor == '&')
      {
        *cursor = '\0';
        request->Parameters[request->ParametersCount].Name = cursor + 1;
        state = state_name;
      }
    }
    cursor++;
  }

  return 0;
}
