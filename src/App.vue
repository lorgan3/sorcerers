<script setup lang="ts">
import { onMounted, ref } from "vue";
import { connect } from "./data/network";

const canvas = ref<HTMLDivElement | null>(null);

onMounted(() => {
  connect(canvas.value!);
});
</script>

<template>
  <div class="render-target" ref="canvas"></div>
</template>

<style>
.wrapper {
  position: relative;
}

.wrapper > canvas {
  position: absolute;
  top: 0;
  left: 0;
}

#app {
  width: 100vw;
  height: 100vh;

  font-size: 24px;
  overflow: hidden;
}

button {
  font-size: 24px;
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
