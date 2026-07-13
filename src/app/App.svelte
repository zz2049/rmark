<script lang="ts">
  import { onMount } from 'svelte';
  import { createEditor } from '../editor/create-editor';
  import { markStartup } from '../editor/performance/performance-sampler';

  let editorHost: HTMLDivElement;

  onMount(() => {
    const session = createEditor(editorHost);
    markStartup('editor-mounted');
    return () => session.destroy();
  });
</script>

<svelte:head>
  <meta name="description" content="RMark 是一个以性能和省电为优先的 Markdown 桌面编辑器。" />
</svelte:head>

<main class="app-shell">
  <header class="titlebar" data-tauri-drag-region>
    <span class="document-title">未命名.md</span>
  </header>
  <div class="editor-shell" bind:this={editorHost} aria-label="Markdown 编辑器"></div>
</main>
