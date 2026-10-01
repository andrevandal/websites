<script lang="ts" generics="T">
  import { Combobox } from "bits-ui"
  import type { SunComboboxProps } from "./Combobox.props.ts"
  import {
    groupItems,
    shouldShowClear,
    shouldClearSelection,
  } from "./Combobox.svelte.utils"

  let {
    items,
    toValue,
    toLabel,
    groupKey,
    value = $bindable(""),
    open = $bindable(false),
    inputValue = $bindable(""),
    loading = false,
    placeholder,
    clearable = true,
    onclear,
    oninputvaluechange,
    onvaluechange,
    item: itemSnippet,
    empty: emptySnippet,
    triggerIcon: triggerIconSnippet,
    clearIcon: clearIconSnippet,
    leading: leadingSnippet,
    caption: captionSnippet,
  }: SunComboboxProps<T> = $props()

  const groups = $derived(groupItems(items, groupKey))
  let selectedLabel = $state("")
  let inputEl = $state<HTMLInputElement | null>(null)
  let syncingProgrammatically = false

  // bits-ui 2.19.0's Combobox.Root treats `inputValue` as an initial value
  // only (its own internal typing handler detaches it into local state on
  // the first keystroke) -- there is no supported way to programmatically
  // update the displayed text afterward through the prop. Driving the real
  // DOM node directly and dispatching a native `input` event keeps bits-ui's
  // own internal state in sync too (its composed `oninput` handler observes
  // the same event). `syncingProgrammatically` stops that echoed event from
  // re-running the stale-selection check or re-firing `oninputvaluechange`
  // with a value the consumer didn't actually type.
  const setDisplayValue = (text: string) => {
    inputValue = text
    if (!inputEl) return
    syncingProgrammatically = true
    inputEl.value = text
    inputEl.dispatchEvent(new Event("input", { bubbles: true }))
    syncingProgrammatically = false
  }

  const handleInput = (e: Event & { currentTarget: HTMLInputElement }) => {
    inputValue = e.currentTarget.value
    if (syncingProgrammatically) return
    if (inputValue !== "" && shouldClearSelection(inputValue, selectedLabel)) {
      value = ""
      selectedLabel = ""
      onvaluechange?.(undefined)
    }
    oninputvaluechange?.(inputValue)
  }

  const handleValueChange = (next: string | undefined) => {
    value = next ?? ""
    if (next) {
      const item = items.find(it => toValue(it) === next)
      if (item) {
        selectedLabel = toLabel(item)
        setDisplayValue(selectedLabel)
      } else {
        selectedLabel = ""
        setDisplayValue("")
      }
    } else {
      selectedLabel = ""
      setDisplayValue("")
    }
    onvaluechange?.(next)
  }

  const handleClear = () => {
    selectedLabel = ""
    setDisplayValue("")
    value = ""
    onclear?.()
  }

  const showClear = $derived(shouldShowClear(clearable, inputValue, value))
  const hasQuery = $derived(inputValue.trim() !== "")

  const isInteractiveControl = (target: EventTarget | null): boolean =>
    target instanceof Element && target.closest("button") !== null

  const openList = (e: { target: EventTarget | null }) => {
    if (isInteractiveControl(e.target)) return
    queueMicrotask(() => {
      open = true
    })
  }
</script>

<Combobox.Root
  type="single"
  bind:open
  value={value || undefined}
  {inputValue}
  onValueChange={handleValueChange}
>
  <div
    class="relative flex h-14 items-center justify-between gap-4 rounded-lg border border-[#d9d5d5] px-4 py-2 ring-4 ring-transparent data-[open]:ring-[rgba(175,55,65,0.25)] has-[:focus-visible]:ring-[rgba(175,55,65,0.25)] duration-150 ease-in-out"
    onclick={openList}
    onfocusin={openList}
    data-open={open || undefined}
  >
    <div class="flex h-full min-w-0 items-center gap-4">
      {#if leadingSnippet}
        {@render leadingSnippet()}
      {/if}
      <div
        class="flex h-full min-h-min gap-x-2 min-w-0 flex-col items-start justify-center py-1"
      >
        {#if captionSnippet}
          {@render captionSnippet()}
        {/if}
        <Combobox.Input
          bind:ref={inputEl}
          class="w-full min-w-0 bg-transparent text-base font-medium text-[#1f1e1e] outline-none"
          oninput={handleInput}
          {placeholder}
        />
      </div>
    </div>
    <div class="flex h-full shrink-0 items-center gap-4">
      {#if showClear}
        <button
          type="button"
          class="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-[#e6e3e3] text-[#6f6a6a]"
          aria-label="Limpar"
          onclick={handleClear}
        >
          {#if clearIconSnippet}
            {@render clearIconSnippet()}
          {/if}
        </button>
      {/if}
      {#if loading}
        <span
          class="size-4 shrink-0 animate-spin rounded-full border-2 border-[#d9d5d5] border-t-[#af3741]"
          aria-hidden="true"
        ></span>
      {:else}
        <Combobox.Trigger
          class="flex size-6 shrink-0 items-center justify-center text-[#6f6a6a]"
        >
          {#if triggerIconSnippet}
            {@render triggerIconSnippet()}
          {/if}
        </Combobox.Trigger>
      {/if}
    </div>
    {#if loading || open}
      <Combobox.ContentStatic
        class="absolute top-[calc(100%+4px)] left-0 z-50 max-h-72 w-full overflow-y-auto rounded-lg border border-[#d9d5d5] bg-white p-1 shadow-lg"
      >
        <Combobox.Viewport>
          {#if loading}
            {#each { length: 3 } as _, i (i)}
              <div
                class="h-9 rounded px-3 py-2 mb-1 bg-gray-200 animate-pulse"
                aria-hidden="true"
              ></div>
            {/each}
          {:else if !hasQuery && items.length === 0}
            <p class="px-3 py-2 text-sm text-[#6f6a6a]">
              Comece a digitar para buscar.
            </p>
          {:else if hasQuery && items.length === 0}
            {#if emptySnippet}
              {@render emptySnippet()}
            {:else}
              <p class="px-3 py-2 text-sm text-[#6f6a6a]">
                Nenhum resultado encontrado.
              </p>
            {/if}
          {:else if groups}
            {#each [...groups.entries()] as [key, groupItems] (key ?? "__ungrouped__")}
              {#if key !== undefined}
                <Combobox.Group>
                  <Combobox.GroupHeading
                    class="px-3 pt-2 pb-1 text-xs font-medium tracking-[1.2px] text-[#6f6a6a] uppercase"
                  >
                    {key}
                  </Combobox.GroupHeading>
                  {#each groupItems as it (toValue(it))}
                    <Combobox.Item
                      value={toValue(it)}
                      label={toLabel(it)}
                      class="cursor-pointer rounded px-3 py-2 text-sm text-[#1f1e1e] data-highlighted:bg-[#f7f6f5]"
                    >
                      {#if itemSnippet}
                        {@render itemSnippet(it)}
                      {:else}
                        {toLabel(it)}
                      {/if}
                    </Combobox.Item>
                  {/each}
                </Combobox.Group>
              {:else}
                {#each groupItems as it (toValue(it))}
                  <Combobox.Item
                    value={toValue(it)}
                    label={toLabel(it)}
                    class="cursor-pointer rounded px-3 py-2 text-sm text-[#1f1e1e] data-highlighted:bg-[#f7f6f5]"
                  >
                    {#if itemSnippet}
                      {@render itemSnippet(it)}
                    {:else}
                      {toLabel(it)}
                    {/if}
                  </Combobox.Item>
                {/each}
              {/if}
            {/each}
          {:else}
            {#each items as it (toValue(it))}
              <Combobox.Item
                value={toValue(it)}
                label={toLabel(it)}
                class="cursor-pointer rounded px-3 py-2 text-sm text-[#1f1e1e] data-highlighted:bg-[#f7f6f5]"
              >
                {#if itemSnippet}
                  {@render itemSnippet(it)}
                {:else}
                  {toLabel(it)}
                {/if}
              </Combobox.Item>
            {/each}
          {/if}
        </Combobox.Viewport>
      </Combobox.ContentStatic>
    {/if}
  </div>
</Combobox.Root>
