
#include "http.h"


int32_t i32_MH_ReceiveLine(MH_Line_t * line, uint8_t * data, uint32_t length)
{
  int32_t count = 0;

  while (count < length)
  {
    switch (line->State)
    {
      case MH_LineState_Reset:
        line->Length = 0;
        if ((data[count] != 0x0D) && (data[count] != 0x0A))
        {
          line->Data[line->Length++] = data[count++];
          line->State = MH_LineState_Content;
        }
        else if (data[count] == 0x0D)
        {
          count++;
          line->State = MH_LineState_EOL;
        }
        else
        {
          // ошибка
          count = MH_RC_LINEERROR;
        }
        break;

      case MH_LineState_Content:
        if (data[count] == 0x0D)
        {
          count++;
          line->State = MH_LineState_EOL;
        }
        else if (data[count] == 0x0A)
        {
          // ошибка
          count = MH_RC_LINEERROR;
        }
        else if (line->Length < MCU_HTTP_LINE_MAX_LENGTH)
        {
          line->Data[line->Length++] = data[count++];
        }
        else
        {
          // не считаем ошибкой, просто теряем часть строки
          // длинные строки нам не нужны
          count++;
        }
        break;
      
      case MH_LineState_EOL:
        if (data[count] == 0x0A)
        {
          count++;
          line->State = MH_LineState_Reset;
        }
        else
        {
          // ошибка
          count = MH_RC_LINEERROR;
        }
        break;

      default:
        // непонятная критическая ошибка, не может быть других состояний
        count = MH_RC_FAULT;
    }

    if ((count < 0) || (line->State == MH_LineState_Reset))
    {
      break;
    }
  }

  return count;
}
