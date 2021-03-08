
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



int32_t i32_MH_SendResponseHeader(MH_Connection_t * connection)
{
  if (connection->Transmitter.Send == NULL)
  {
    return -1; // TODO: коды возврата
  }

  uint8_t * buf = connection->Transmitter.Buffer;
  uint32_t buf_size = connection->Transmitter.BufferSize;
  int32_t total_length = snprintf(buf, buf_size, "HTTP/1.1 %d %s\r\n", 
                                  connection->Response.Code, s_MH_GetResponseTextByCode(connection->Response.Code));
  // здесь и далее проверяем, что остался большой запас в буфере (пару байт)
  // конечно, есть вероятность, что прописали целиком, и все точно, но проще сделать обязательный запас
  // и не думать, как проверить, все ли влезло
  // и запас пару байт на пустую строчку
  if (total_length >= (buf_size - 3))
  {
    // ошибка, слишком маленький буфер
    return -1; // TODO: коды возврата
  }

  int32_t header_index = 0;
  const int32_t headers_count = i32_MH_GetHeaderTableSize();
  while (header_index < headers_count)
  {
    int32_t line_length = i32_MH_WriteHeaderLine(&connection->Response.Headers, &buf[total_length], 
                                                              buf_size - total_length, header_index);
    if ((total_length + line_length) >= (buf_size - 3))
    {
      if (total_length == 0)
      {
        // ошибка, слишком маленький буфер
        return -1; // TODO: коды возврата
      }
      else
      {
        // отправляем
        int32_t ret = connection->Transmitter.Send(connection->Transmitter.UserData, buf, total_length);
        if (ret != total_length)
        {
          return -1; // TODO: коды возврата
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
  buf[total_length++] = '\r';
  buf[total_length++] = '\n';
  int32_t ret = connection->Transmitter.Send(connection->Transmitter.UserData, buf, total_length);
  if (ret != total_length)
  {
    return -1; // TODO: коды возврата
  }


  return 0;
}

