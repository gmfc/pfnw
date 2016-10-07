#include "HX711.h"

// HX711.DOUT  - pin #A1
// HX711.PD_SCK - pin #A0

#define DOUT A0
#define PD_SCK A1
#define DOUT1 A2
#define PD_SCK1 A3
#define DOUT2 A7
#define PD_SCK2 A8
#define DOUT3 A9
#define PD_SCK3 A10


HX711 scale(DOUT, PD_SCK);    // parameter "gain" is ommited; the default value 128 is used by the library
HX711 scale1(DOUT1, PD_SCK1); 
HX711 scale2(DOUT2, PD_SCK2);
HX711 scale3(DOUT3, PD_SCK3);

void setup() {
  Serial.begin(9600);
  Serial.println("hello, it's me"); 
  
   

  scale.set_scale(2280.f);                      // this value is obtained by calibrating the scale with known weights; see the README for details
  scale.tare();               // reset the scale to 0
  scale1.set_scale(2280.f);                      // this value is obtained by calibrating the scale with known weights; see the README for details
  scale1.tare();               // reset the scale to 0
  scale2.set_scale(2280.f);                      // this value is obtained by calibrating the scale with known weights; see the README for details
  scale2.tare();               // reset the scale to 0
  scale3.set_scale(2280.f);                      // this value is obtained by calibrating the scale with known weights; see the README for details
  scale3.tare();               // reset the scale to 0
  
  

  
}

void loop() {
  double t, TL,BL,TR,BR;
  t=millis();
  TL=scale.get_units();
  BL=scale1.get_units();
  TR=scale2.get_units();
  BR=scale3.get_units();
 Serial.print(t);
 Serial.print(";");
 Serial.print(TR/10);
 Serial.print(";");
 Serial.print(TL/10);
 Serial.print(";");
 Serial.print(BR/10);
 Serial.print(";");
 Serial.print(BL/10);
 Serial.print("#");             
 // delay(1);
  
}
