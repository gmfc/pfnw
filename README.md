[![Build Status](https://travis-ci.org/gmfc/pfnw.svg?branch=master)](https://travis-ci.org/gmfc/pfnw) [![Codacy Badge](https://api.codacy.com/project/badge/Grade/2ca31189b4db4851afb4b411783272d3)](https://www.codacy.com/app/gabriel-mfcorreia/pfnw?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=gmfc/pfnw&amp;utm_campaign=Badge_Grade) [![Dependencies](https://david-dm.org/gmfc/pfnw.svg)](https://david-dm.org)

# pfnw

Plataforma de Força NW, é um projeto desenvolvido pela Fábrica de Software Mackenzie com o objetivo de criar uma solução para medição e análise ortopédica baseada em Centro de Pressão. O Projeto consiste de um Software controlador feito em NODE e NW (antigo Node Webkit), e uma plataforma física controlada por um Arduino.

Neste repositório encontraras o código do software controlador, e o código do Arduino.

![img1](https://gmfc.github.io/pfnw/screens/1.png)

![img2](https://gmfc.github.io/pfnw/screens/2.png)

![img3](https://gmfc.github.io/pfnw/screens/3.png)


## Progresso

![Progresso](https://gmfc.github.io/pfnw/UML/progresso.svg)

## Como Compilar

### Pré requisitos:

* git instalado e configurado.
* Node instalado e configurado.
* [Arnuino IDE e drivers](https://www.arduino.cc/en/Main/Software)

### Clonar o repositório

Execute:
`git clone https://github.com/gmfc/pfnw.git`

### Instale todas as dependen
vá até o diretório em que o repositório clonado se encontra: `cd pfnw`.

Na raiz do diretório execute:
`node install`

### Executando o programa e desenvolvendo
Para iniciar o software (em ambiende de desenvolvimento) execute `npm start`.

Para compilar mudanças feitas no código, execute: `npm run build`.

Para que as mudanças sejam compiladas automaticamente: `npm run watch:test`.

Para efetuar testes unitários: `npm test`.

Para que os testes sejam executados a cada mudança do código automaticamente: `npm run watch:test`.

Para recompilar a documentação: `npm run docs`.

### Criando uma distribuição
Se necessário, altere a verção do software em `./package.json`.

`npm run dist` irá compilar, limpar, baixar dependencias, baixar NW, criar diretório de distribuição e por fim, criar pasta com o software pronto para ser usado.

### Programando o Arduino
O Código do mesmo se encontra em `./Arduino/arnuino.ino`.
Utiliza-se da bibliotéca [`HX711.h`](https://github.com/bogde/HX711)
