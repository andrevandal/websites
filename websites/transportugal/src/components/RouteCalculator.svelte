<script lang="ts">
  import type { Snippet } from "svelte"

  import { fade } from "svelte/transition"
  import { untrack } from "svelte"
  import { actions } from "astro:actions"
  import Combobox from "./ui/Combobox.svelte"
  import { ROUTE_SERVICES } from "../data/route-services"
  import type { Area } from "../data/allowed-locations"
  import type { LocationMatch } from "@/services/location-search"
  import type { BrazilCity } from "../data/brazil-cities.generated"
  import {
    buildInitialComboboxItems,
    originToValue,
    originToLabel,
    parseOriginValue,
    shouldSearchOrigin,
    shouldSearchDestination,
    destinationToValue,
    destinationToLabel,
    destinationGroupKey,
    parseDestinationValue,
    formatDestinationQuery,
  } from "@utils"

  type Props = {
    destinations: Area[]
    pinIcon: Snippet<[]>
    clockIcon: Snippet<[]>
    checkIcon: Snippet<[]>
    closeIcon: Snippet<[]>
    cta?: Snippet<[]>
    // Astro's JSX-based type checker (astro check) does not model
    // named-slot -> Svelte-5-snippet-prop bridging for framework
    // components; without an explicit `children` type it rejects any
    // .astro usage that passes more than one `slot="x"` child, even
    // though the runtime bridging itself works correctly (verified via
    // live browser). This prop is never destructured/used.
    children?: unknown
  }

  let { destinations, pinIcon, clockIcon, checkIcon, closeIcon, cta }: Props =
    $props()

  let origin = $state<{ cidade: string; uf: string } | null>(null)
  let originQuery = $state("")
  let originLoading = $state(false)
  let originRequestId = 0

  let destination = $state<{ areaId: string; cidade?: string } | null>(null)
  let destinationQuery = $state("")
  let destinationLoading = $state(false)
  let destinationRequestId = 0

  const initialCombobox = untrack(() => buildInitialComboboxItems(destinations))
  let originItems = $state<BrazilCity[]>(initialCombobox.originItems)
  let destinationItems = $state<LocationMatch[]>(
    initialCombobox.destinationItems
  )

  let result = $state<{
    deliveryTimeLabel: string
    services: { id: string; label: string; available: boolean }[]
  } | null>(null)
  let calculating = $state(false)
  let calcError = $state(false)

  const phase = $derived.by(() => {
    if (!origin || !destination) return "empty"
    if (calcError) return "error"
    if (calculating || !result) return "calculating"
    return "filled"
  })

  let originDebounce: ReturnType<typeof setTimeout> | undefined
  const handleOriginInput = (value: string) => {
    originQuery = value
    clearTimeout(originDebounce)
    originLoading = true
    if (!shouldSearchOrigin(value)) {
      originLoading = false
      ;({ originItems } = initialCombobox)
      ++originRequestId
      return
    }
    originDebounce = setTimeout(async () => {
      const requestId = ++originRequestId
      const { data } = await actions.searchOrigin({ query: value })
      if (requestId === originRequestId) {
        originItems = data ?? []
        originLoading = false
      }
    }, 250)
  }

  let destinationDebounce: ReturnType<typeof setTimeout> | undefined
  const handleDestinationInput = (value: string) => {
    destinationQuery = value
    clearTimeout(destinationDebounce)
    destinationLoading = true
    if (!shouldSearchDestination(value)) {
      destinationLoading = false
      ;({ destinationItems } = initialCombobox)
      ++destinationRequestId
      return
    }
    destinationDebounce = setTimeout(async () => {
      const requestId = ++destinationRequestId
      const { data } = await actions.searchDestination({
        query: value,
      })
      if (requestId === destinationRequestId) {
        destinationItems = data ?? []
        destinationLoading = false
      }
    }, 250)
  }

  const handleOriginValueChange = (value: string | undefined) => {
    origin = parseOriginValue(value)
    originQuery = origin ? originToLabel(origin) : originQuery
  }

  const handleDestinationValueChange = (value: string | undefined) => {
    destination = parseDestinationValue(value)
    destinationQuery = destination
      ? formatDestinationQuery(destination)
      : destinationQuery
  }

  $effect(() => {
    if (!origin || !destination) {
      result = null
      calculating = false
      calcError = false
      return
    }
    let cancelled = false
    calculating = true
    calcError = false
    ;(async () => {
      try {
        const { data } = await actions.calculate({
          originCidade: origin.cidade,
          originUf: origin.uf,
          destinationAreaId: destination.areaId,
          destinationCidade: destination.cidade,
        })
        if (cancelled) return
        calculating = false
        if (data) result = data
        else calcError = true
      } catch {
        if (cancelled) return
        calculating = false
        calcError = true
      }
    })()
    return () => {
      cancelled = true
    }
  })
</script>

<div
  class="flex flex-1 flex-col gap-4 rounded-lg border border-[#d9d5d5] bg-white p-4 sm:p-6"
>
  <div class="flex items-center justify-center border-b border-[#d9d5d5] pb-4">
    <p class="text-3xl font-medium text-[#1f1e1e]">Calcule o prazo</p>
  </div>

  <div class="flex flex-col gap-4">
    {#snippet originCaption()}
      <p class="text-xs tracking-[1.2px] text-[#6f6a6a] uppercase">origem</p>
    {/snippet}
    {#snippet destinationCaption()}
      <p class="text-xs tracking-[1.2px] text-[#6f6a6a] uppercase">Destino</p>
    {/snippet}

    <Combobox
      items={originItems}
      toValue={originToValue}
      toLabel={originToLabel}
      bind:inputValue={originQuery}
      loading={originLoading}
      placeholder="Selecione a região"
      oninputvaluechange={handleOriginInput}
      onvaluechange={handleOriginValueChange}
      onclear={() => {
        origin = null
        originQuery = ""
        originItems = initialCombobox.originItems
        originLoading = false
        clearTimeout(originDebounce)
        originRequestId++
      }}
      leading={pinIcon}
      caption={originCaption}
    />

    <Combobox
      items={destinationItems}
      toValue={destinationToValue}
      toLabel={destinationToLabel}
      groupKey={destinationGroupKey}
      bind:inputValue={destinationQuery}
      loading={destinationLoading}
      placeholder="Selecione uma região"
      oninputvaluechange={handleDestinationInput}
      onvaluechange={handleDestinationValueChange}
      onclear={() => {
        destination = null
        destinationQuery = ""
        destinationItems = initialCombobox.destinationItems
        destinationLoading = false
        clearTimeout(destinationDebounce)
        destinationRequestId++
      }}
      leading={pinIcon}
      caption={destinationCaption}
    />
  </div>

  {#if phase === "empty" || phase === "error"}
    <div
      in:fade={{ duration: 150 }}
      class="flex flex-col items-center gap-4 rounded-lg border border-[#d9d5d5] p-6 text-center"
    >
      {@render clockIcon()}
      <p class="text-base font-medium text-[#1f1e1e]">
        {phase === "error"
          ? "Não foi possível calcular o tempo de entrega. Tente novamente."
          : "Selecione origem e destino"}
      </p>
      <p class="text-sm text-[#6f6a6a]">
        {phase === "error"
          ? ""
          : "Digite as primeiras letras da cidade ou escolha a região inteira. O prazo aparece aqui na hora."}
      </p>
    </div>
    {@render cta?.()}
  {:else}
    <div
      in:fade={{ duration: 150 }}
      class="flex flex-col overflow-hidden rounded-lg border border-[#d9d5d5]"
    >
      <div class="flex flex-col gap-4 bg-[#f7f6f5] p-6">
        <p class="text-base text-[#af3741] uppercase">Prazo estimado</p>
        {#if phase === "calculating"}
          <div class="h-8 w-3/4 animate-pulse rounded bg-gray-300"></div>
        {:else}
          <p class="text-2xl font-medium text-[#1f1e1e]">
            {result?.deliveryTimeLabel}
          </p>
        {/if}
        <p class="text-base leading-relaxed text-[#6f6a6a]">
          Contado após da coleta, em dias úteis
        </p>
      </div>
      <div class="flex flex-col gap-4 p-6">
        <p class="text-base font-medium text-[#6f6a6a] uppercase">
          serviços disponíveis
        </p>
        <div class="flex flex-wrap gap-2">
          {#if phase === "calculating"}
            {#each { length: ROUTE_SERVICES.length } as _, i (i)}
              <div
                class="h-8 w-40 animate-pulse rounded-full bg-gray-200"
              ></div>
            {/each}
          {:else}
            {#each result?.services ?? [] as service (service.id)}
              <div
                class="flex items-center gap-1 rounded-full border border-[#d9d5d5] py-1.5 pr-4 pl-3"
              >
                {#if service.available}
                  {@render checkIcon()}
                {:else}
                  {@render closeIcon()}
                {/if}
                <p class="text-sm font-medium text-[#1f1e1e]">
                  {service.label}
                </p>
              </div>
            {/each}
          {/if}
        </div>
      </div>
    </div>
    {@render cta?.()}
  {/if}
</div>
