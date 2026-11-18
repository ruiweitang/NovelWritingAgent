<script setup lang="ts">
/**
 * 内容编辑器：占满容器的 Markdown 原文编辑文本域
 */
const model = defineModel<string>({ required: true })
</script>

<template>
  <textarea
    v-model="model"
    class="app-textarea editor"
    placeholder="在此编辑 Markdown 内容…"
    spellcheck="false"
  />
</template>

<style scoped>
.editor {
  height: 100%;
  min-height: 240px;
  resize: none;
  border: none;
  background: transparent;
  font-family: var(--font-mono);
  font-size: 13.5px;
  line-height: 1.8;
}
.editor:focus {
  box-shadow: none;
  background: transparent;
}
</style>
