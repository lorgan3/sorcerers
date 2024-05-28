<script setup lang="ts">
import { RouterView } from "vue-router";
</script>

<template>
  <RouterView />
</template>

<style>
:root {
  --primary: #402020;
  --background: #bca88c;
  --background-dark: #9f8e76;
  --highlight: #80331e;
  --highlight-background: #9d8877;

  --small-radius: 3px;
  --big-radius: 6px;
  --stroke-length: 43.425px;
}

@property --pulse {
  syntax: "<number>";
  initial-value: 1;
  inherits: false;
}

@property --dash-offset {
  syntax: "<number>";
  initial-value: 0;
  inherits: false;
}

@font-face {
  /* https://www.1001freefonts.com/eternal.font */
  font-family: Eternal;
  src: url(./assets/Eternal.ttf);
}

#app {
  min-height: 100vh;

  font-size: 18px;
  overflow: hidden;
  font-family: system-ui;
}

button {
  font-size: 28px;
  font-family: Eternal;
}

.primary {
  background: var(--background);
  color: var(--primary);
  border: 4px solid var(--highlight);
  box-shadow: 2px 2px 2px var(--highlight), 0 0 5px inset var(--highlight);
  border-radius: var(--big-radius);
  letter-spacing: 1.2px;
  cursor: pointer;
  padding: 5px 15px;
  transition: 0.5s color;
}

.primary:not([disabled]):hover {
  box-shadow: 0 0 5px inset var(--highlight);
  position: relative;
  top: 2px;
  left: 2px;
  color: var(--highlight);
}

.secondary {
  background: transparent;
  border: none;
  text-decoration: underline;
  border-radius: var(--big-radius);
  letter-spacing: 1.2px;
  cursor: pointer;
  padding: 5px 15px;
  transition: 0.5s color, 0.25s background-color;
}

.secondary:not([disabled]):hover {
  background: var(--background);
  color: var(--highlight);
}

.icon-button {
  background: none;
  border: none;
  margin: -4px 0;
  padding: 0;
  cursor: pointer;
  font-size: 18px;
  vertical-align: middle;
}

.truncate {
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  width: 100%;
}

.flex-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: fit-content;
}

.flex-list--wide {
  width: 100%;
}

@keyframes pulse {
  0% {
    --pulse: 1;
  }

  50% {
    --pulse: 1.6;
  }

  100% {
    --pulse: 1;
  }
}

@keyframes rotateBorder {
  0% {
    stroke-dashoffset: calc(var(--dash-offset, 0) * var(--stroke-length));
  }

  100% {
    stroke-dashoffset: calc(
      (var(--dash-offset, 0) * var(--stroke-length)) + var(--stroke-length) * 2
    );
  }
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
h1,
h2,
h3 {
  font-family: Eternal;
  color: var(--primary);
}
h3 {
  font-size: 24px;
}

h2 {
  font-size: 32px;
}

h1 {
  font-size: 48px;
}
</style>
