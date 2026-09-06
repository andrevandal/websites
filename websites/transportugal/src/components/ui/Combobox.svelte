<script lang="ts" generics="T">
  import { SunCombobox } from "@vandal-websites/sun-ui/svelte"
  import type { SunComboboxProps } from "@vandal-websites/sun-ui/svelte"
  import { Icon } from "astro-iconset/svelte"

  type Props = Omit<SunComboboxProps<T>, "triggerIcon" | "clearIcon">

  let {
    value = $bindable(""),
    open = $bindable(false),
    inputValue = $bindable(""),
    ...rest
  }: Props = $props()
</script>

{#snippet trigger()}
  <Icon name="chevron" width={16} height={16} class="text-[#6f6a6a]" />
{/snippet}

{#snippet clear()}
  <Icon name="close" width={20} height={20} class="text-[#af3741]" />
{/snippet}

<SunCombobox
  bind:value
  bind:open
  bind:inputValue
  {...rest}
  triggerIcon={trigger}
  clearIcon={clear}
/>
