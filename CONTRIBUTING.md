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
