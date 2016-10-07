#include "HX711.h"

// HX711.DOUT  - pin #A1
// HX711.PD_SCK - pin #A0


// TR
#define DOUT_TR A0
#define PD_SCK_TR A1

// TL
#define DOUT_TL A2
#define PD_SCK_TL A3

// BR
#define DOUT_BR A7
#define PD_SCK_BR A8

// BL
#define DOUT_BL A9
#define PD_SCK_BL A10


// Sensores
HX711 TR_scale(DOUT_TR, PD_SCK_TR);

HX711 TL_scale(DOUT_TL, PD_SCK_TL);

HX711 BR_scale(DOUT_BR, PD_SCK_BR);

HX711 BL_scale(DOUT_BL, PD_SCK_BL);

void setup() {
  Serial.begin(57600);

  TR_scale.set_scale(2280.f);
  TR_scale.tare();

  TL_scale.set_scale(2280.f);
  TL_scale.tare();

  BR_scale.set_scale(2280.f);
  BR_scale.tare();

  BL_scale.set_scale(2280.f);
  BL_scale.tare();

}

void loop() {
  Serial.print(millis());
  Serial.print(";");
  Serial.print(TR_scale.get_units());
  Serial.print(";");
  Serial.print(TL_scale.get_units());
  Serial.print(";");
  Serial.print(BR_scale.get_units());
  Serial.print(";");
  Serial.print(BL_scale.get_units());
  Serial.print("#");
}
