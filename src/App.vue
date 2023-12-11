<script setup lang="ts">
import MainMenu from "./components/MainMenu.vue";
</script>

<template>
  <MainMenu />
</template>

<style>
@font-face {
  /* https://www.1001freefonts.com/eternal.font */
  font-family: Eternal;
  src: url(./assets/Eternal.ttf);
}

#app {
  width: 100vw;
  height: 100vh;

  font-size: 24px;
  overflow: hidden;
  font-family: Eternal;
}

button {
  font-size: 24px;
  font-family: Eternal;
}

.primary {
  background: #686051;
  color: #cdcac2;
  border: 4px solid #433e34;
  border-radius: 10px;
  letter-spacing: 1.2px;
  cursor: pointer;
  padding: 3px;
}

.primary:hover {
  background: #776d5c;
}

.secondary {
  background: none;
  border: none;
  text-decoration: underline;
  cursor: pointer;
  text-align: left;
}

/* http://meyerweb.com/eric/tools/css/reset/ 
   v2.0 | 20110126
   License: none (public domain)
*/
html,
body,
div,
span,
applet,
object,
iframe,
h1,
h2,
h3,
h4,
h5,
h6,
p,
blockquote,
pre,
a,
abbr,
acronym,
address,
big,
cite,
code,
del,
dfn,
em,
img,
ins,
kbd,
q,
s,
samp,
small,
strike,
strong,
sub,
sup,
tt,
var,
b,
u,
i,
center,
dl,
dt,
dd,
ol,
ul,
li,
fieldset,
form,
label,
legend,
table,
caption,
tbody,
tfoot,
thead,
tr,
th,
td,
article,
aside,
canvas,
details,
embed,
figure,
figcaption,
footer,
header,
hgroup,
menu,
nav,
output,
ruby,
section,
summary,
time,
mark,
audio,
video {
  margin: 0;
  padding: 0;
  border: 0;
  font-size: 100%;
  font: inherit;
  vertical-align: baseline;
}
ol,
ul {
  list-style: none;
}
table {
  border-collapse: collapse;
  border-spacing: 0;
}

/* */
h3 {
  font-size: 18px;
  font-weight: bold;
}
</style>
