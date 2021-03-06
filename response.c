
#include "http.h"


typedef struct
{
  uint32_t        Code;
  const uint8_t * Text;

} MH_ResponseCodeTable_t;


static const MH_ResponseCodeTable_t MH_ResponseCodeTable[] = 
{
  {200, "OK"},

  {400, "Bad Request"},
  {404, "Not Found"},
  {413, "Payload Too Large"},
  {414, "URI Too Long"},

  {500, "Internal Server Error"},
  {501, "Not Implemented"},
};


#define MH_RESPONSE_CODE_TABLE_SIZE   (sizeof(MH_ResponseCodeTable) / sizeof(MH_ResponseCodeTable[0]))


const uint8_t * s_MH_GetResponseTextByCode(uint32_t code)
{
  const uint8_t * text = "";

  for (uint32_t i = 0; i < MH_RESPONSE_CODE_TABLE_SIZE; i++)
  {
    if (MH_ResponseCodeTable[i].Code == code)
    {
      text = MH_ResponseCodeTable[i].Text;
      break;
    }
  }

  return text;
}



int32_t i32_MH_SendResponseHeader(MH_Connection_t * connection, uint8_t * buffer, uint32_t buffer_size)
{
  if (connection->Callbacks.Send == NULL)
  {
    return MH_RC_INVALARG;
  }

  int32_t total_length = snprintf(buffer, buffer_size, "HTTP/1.1 %d %s\r\n", 
                                  connection->Response.Code, s_MH_GetResponseTextByCode(connection->Response.Code));
  // здесь и далее проверяем, что остался большой запас в буфере (пару байт)
  // конечно, есть вероятность, что прописали целиком, и все точно, но проще сделать обязательный запас
  // и не думать, как проверить, все ли влезло
  // и запас пару байт на пустую строчку
  if (total_length >= (buffer_size - 3))
  {
    // ошибка, слишком маленький буфер
    return MH_RC_SMALLBUFFER;
  }

  int32_t header_index = 0;
  const int32_t headers_count = i32_MH_GetHeaderTableSize();
  while (header_index < headers_count)
  {
    int32_t line_length = i32_MH_WriteHeaderLine(&connection->Response.Headers, &buffer[total_length], 
                                                              buffer_size - total_length, header_index);
    if ((total_length + line_length) >= (buffer_size - 3))
    {
      if (total_length == 0)
      {
        // ошибка, слишком маленький буфер
        return MH_RC_SMALLBUFFER;
      }
      else
      {
        // отправляем
        int32_t ret = connection->Callbacks.Send(connection, buffer, total_length);
        if (ret != total_length)
        {
          return MH_RC_SENDERROR;
        }
        total_length = 0;
      }
    }
    else
    {
      // прописали в буфер, переходим к следующему
      header_index++;
      total_length += line_length;
    }
  }

  // в конце дописать пустую строчку (место зарезервировано) и отправить
  buffer[total_length++] = '\r';
  buffer[total_length++] = '\n';
  int32_t ret = connection->Callbacks.Send(connection, buffer, total_length);
  if (ret != total_length)
  {
    return MH_RC_SENDERROR;
  }


  return MH_RC_OK;
}

