
#include "methods.h"
#include "http.h"


const MH_MethodTable_t MH_MethodTable[MH_Method_LastIndex] = {

    [MH_Method_GET]   = {MH_NAME_AND_LENGTH("GET")},
    [MH_Method_POST]  = {MH_NAME_AND_LENGTH("POST")}
};
