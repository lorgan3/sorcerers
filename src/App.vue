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
  --glow-warm: rgba(180, 120, 40, 0.3);
  --glow-warm-soft: rgba(180, 120, 40, 0.1);
  --border-accent: #80331e;
  --border-accent-hover: #a04428;
  --border-accent-faint: rgba(128, 51, 30, 0.4);
  --parchment-light: #d8c4a4;
  --parchment-dark: #c4a882;
  --parchment-hover-light: #e0ccac;
  --parchment-hover-dark: #ccb08a;
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

/* Themed scrollbars */
* {
  scrollbar-color: var(--background-dark) transparent;
  scrollbar-width: thin;
}

*::-webkit-scrollbar {
  width: 6px;
}

*::-webkit-scrollbar-track {
  background: transparent;
}

*::-webkit-scrollbar-thumb {
  background: var(--background-dark);
  border-radius: 3px;
}

*::-webkit-scrollbar-thumb:hover {
  background: var(--highlight-background);
}

button {
  font-size: 28px;
  font-family: Eternal;
}

.primary {
  background: linear-gradient(180deg, var(--parchment-light), var(--parchment-dark));
  color: var(--primary);
  border: 2px solid var(--border-accent);
  border-radius: 2px;
  box-shadow: 0 2px 5px rgba(30, 15, 5, 0.3);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.15);
  letter-spacing: 1.2px;
  cursor: pointer;
  padding: 8px 20px;
  position: relative;
  transition: all 0.3s ease;
}

.primary::before,
.primary::after {
  content: '';
  position: absolute;
  width: 10px;
  height: 10px;
  border-color: var(--border-accent-faint);
  border-style: solid;
  transition: all 0.3s ease;
}

.primary::before {
  top: 3px;
  left: 3px;
  border-width: 2px 0 0 2px;
}

.primary::after {
  bottom: 3px;
  right: 3px;
  border-width: 0 2px 2px 0;
}

.primary:not([disabled]):hover {
  background: linear-gradient(180deg, var(--parchment-hover-light), var(--parchment-hover-dark));
  color: var(--highlight);
  border-color: var(--border-accent-hover);
  box-shadow: 0 2px 5px rgba(30, 15, 5, 0.3), inset 0 0 20px var(--glow-warm-soft);
}

.primary:not([disabled]):hover::before,
.primary:not([disabled]):hover::after {
  width: 14px;
  height: 14px;
  border-color: var(--border-accent-hover);
}

.primary:focus-visible {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--glow-warm);
}

.primary[disabled] {
  opacity: 0.5;
  filter: saturate(0.6);
  cursor: not-allowed;
}

.secondary {
  background: transparent;
  border: none;
  text-decoration: none;
  border-radius: var(--big-radius);
  letter-spacing: 1.2px;
  cursor: pointer;
  padding: 5px 15px;
  transition: 0.3s color;
  position: relative;
}

.secondary::after {
  content: '';
  position: absolute;
  bottom: 3px;
  left: 15px;
  right: 15px;
  height: 2px;
  background: var(--border-accent);
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.secondary:not([disabled]):hover {
  color: var(--highlight);
}

.secondary:not([disabled]):hover::after {
  transform: scaleX(1);
}

.section-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: Eternal;
  font-size: 32px;
  color: var(--border-accent);

  &::before {
    content: '◆';
    font-size: 18px;
    color: var(--border-accent);
  }
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

.input-label {
  flex-direction: column;

  .label {
    font-family: Eternal;
    font-size: 24px;
    color: var(--primary);
    width: auto;
  }
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

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.spinner {
  display: inline-block;
  transform-origin: 50%;
  animation: spin 0.8s linear infinite;
  color: var(--border-accent);
}

@keyframes appear {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
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

/* Global focus styles */
*:focus {
  outline: none;
}

*:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--glow-warm);
}

/* */
h1,
h2,
h3,
h4 {
  font-family: Eternal;
  color: var(--primary);
}

h4 {
  font-size: 20px;
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

a {
  color: var(--highlight);
  font-weight: bold;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.checkbox-label {
  flex-direction: row;
  white-space: nowrap;
  position: relative;
  padding-left: 38px;
  line-height: 25px;

  .label {
    margin-right: 10px;
  }

  /* Hide the browser's default checkbox */
  input {
    position: absolute;
    opacity: 0;
    cursor: pointer;
    height: 0;
    width: 0;
  }

  /* Create a custom checkbox */
  .checkmark {
    position: absolute;
    top: 0;
    left: 0;
    height: 25px;
    width: 25px;
    background: linear-gradient(180deg, var(--parchment-light), var(--parchment-dark));
    border: 1px solid var(--border-accent-faint);
    border-radius: 2px;
    transition: background 0.2s ease, box-shadow 0.2s ease;
  }

  /* On mouse-over, add glow */
  &:hover input ~ .checkmark {
    background: linear-gradient(180deg, var(--parchment-hover-light), var(--parchment-hover-dark));
    box-shadow: 0 0 6px var(--glow-warm-soft);
  }

  /* When the checkbox is checked */
  input:checked ~ .checkmark {
    background: linear-gradient(180deg, var(--highlight-background), var(--background-dark));
    box-shadow: 0 0 6px var(--glow-warm-soft);
    border-color: var(--border-accent);
  }

  /* Create the checkmark/indicator (hidden when not checked) */
  .checkmark:after {
    content: "";
    position: absolute;
    display: none;
  }

  /* Show the checkmark when checked */
  input:checked ~ .checkmark:after {
    display: block;
  }

  /* Style the checkmark/indicator */
  .checkmark:after {
    left: 9px;
    top: 5px;
    width: 5px;
    height: 10px;
    border: solid var(--highlight);
    border-width: 0 3px 3px 0;
    -webkit-transform: rotate(45deg);
    -ms-transform: rotate(45deg);
    transform: rotate(45deg);
  }
}
</style>
