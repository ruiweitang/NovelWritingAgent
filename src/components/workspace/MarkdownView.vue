<script setup lang="ts">
/**
 * Markdown 渲染视图：markdown-it 安全渲染，流式时显示闪烁光标
 */
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'

const props = withDefaults(
  defineProps<{
    content: string
    streaming?: boolean
  }>(),
  { streaming: false },
)

/** markdown-it 实例（禁用原始 HTML，防注入） */
const md = new MarkdownIt({ html: false, linkify: true, breaks: true })

/** 渲染后的 HTML */
const html = computed(() => md.render(props.content))
</script>

<template>
  <div
    class="markdown-body"
    :class="{ 'stream-caret': streaming }"
    v-html="html"
  />
</template>
