<script lang="ts">
  import { DRINKS } from "#/data/calculator"
  import {
    clampQuantity,
    formatKg,
    iceForDrinks,
    iceForPeople,
    orderLink,
  } from "#/utils/ice-calculator"
  import type { CalculatorMode } from "#/utils/ice-calculator"

  // Field values stay strings so a cleared field is not rewritten to "0" while typing.
  let mode = $state<CalculatorMode>("people")
  let peopleText = $state("0")
  let quantityTexts = $state(DRINKS.map(() => "0"))

  const toNumber = (text: string): number => clampQuantity(Number(text))

  const kg = $derived(
    mode === "people"
      ? iceForPeople(toNumber(peopleText))
      : iceForDrinks(quantityTexts.map(toNumber))
  )

  const reset = () => {
    peopleText = "0"
    quantityTexts = DRINKS.map(() => "0")
  }

  const setMode = (next: CalculatorMode) => {
    mode = next
    reset()
  }

  const step = (text: string, delta: 1 | -1): string =>
    String(clampQuantity(toNumber(text) + delta))

  // Clamp typed input; leave an empty field empty.
  const clampField = (field: HTMLInputElement): string => {
    if (field.value === "") return ""
    const clamped = String(clampQuantity(field.valueAsNumber))
    field.value = clamped
    return clamped
  }

  const tabClass =
    "w-[160px] rounded-lg border border-true-blue-900 px-4 py-[14px] font-medium text-water-50 duration-300 hover:bg-true-blue-900 lg:flex-1"
  const stepperClass =
    "ice-halo flex items-center justify-center gap-2 rounded-lg text-base font-medium whitespace-nowrap text-true-gray-800 md:text-lg"
</script>

<section class="flex h-full flex-col items-center justify-between lg:w-full">
  <div class="flex items-center gap-2 py-5 lg:w-full lg:justify-between">
    <button
      type="button"
      aria-pressed={mode === "people"}
      class={[tabClass, mode === "people" && "bg-true-blue-900"]}
      onclick={() => setMode("people")}
    >
      Por pessoa
    </button>
    <button
      type="button"
      aria-pressed={mode === "drinks"}
      class={[tabClass, mode === "drinks" && "bg-true-blue-900"]}
      onclick={() => setMode("drinks")}
    >
      Qtd. bebidas
    </button>
  </div>
  <div class="w-full">
    {#if mode === "people"}
      <div class="space-y-2">
        <p class="text-[24px] text-water-50">
          Calcule o gelo pela quantidade de convidados do seu evento
        </p>
        <div
          class="mx-auto flex max-w-[200px] items-center justify-between rounded-xl border border-true-gray-500 p-1 text-water-50"
        >
          <button
            type="button"
            aria-label="Diminuir número de pessoas"
            class="{stepperClass} h-[52px] w-[52px]"
            onclick={() => (peopleText = step(peopleText, -1))}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="21"
              height="20"
              fill="none"
              aria-hidden="true"
            >
              <path
                fill="currentColor"
                d="m7.181 9.999 6.531-6.801a.445.445 0 0 0-.008-.617l-1.168-1.196a.423.423 0 0 0-.605-.008L3.954 9.682a.408.408 0 0 0-.117.317.432.432 0 0 0 .117.316l7.977 8.309a.424.424 0 0 0 .606-.008l1.167-1.196a.445.445 0 0 0 .008-.617L7.181 10Z"
              />
            </svg>
          </button>
          <span class="font-bold text-water-50">
            <input
              type="number"
              inputmode="numeric"
              min="0"
              max="999"
              placeholder="0"
              aria-label="Número de pessoas"
              value={peopleText}
              oninput={e => (peopleText = clampField(e.currentTarget))}
              class="h-[52px] w-[75px] bg-transparent p-2 text-center focus:ring-0 focus:outline-hidden"
            />
          </span>
          <button
            type="button"
            aria-label="Aumentar número de pessoas"
            class="{stepperClass} h-[52px] w-[52px]"
            onclick={() => (peopleText = step(peopleText, 1))}
          >
            <svg
              width="21"
              height="20"
              viewBox="0 0 21 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M13.8189 9.99857L7.2877 3.19779C7.12364 3.02982 7.12754 2.75248 7.29551 2.5806L8.46348 1.38529C8.63145 1.21342 8.80488 1.20951 9.06895 1.37748L17.0455 9.68607C17.1314 9.77201 17.1705 9.8892 17.1627 10.0025C17.1666 10.1197 17.1275 10.2329 17.0455 10.3189L9.06895 18.6236C8.90488 18.7915 8.63145 18.7876 8.46348 18.6158L7.29551 17.4204C7.12754 17.2486 7.12364 16.9712 7.2877 16.8033L13.8189 9.99857Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
        <p class="text-[24px] text-water-50">Pessoas</p>
      </div>
    {:else}
      <div class="flex-1">
        <ul class="flex w-full flex-col gap-2">
          {#each DRINKS as drink, i (drink.name)}
            <li class="flex w-full items-center justify-between gap-2">
              <span class="w-full text-left text-water-50">{drink.name}</span>
              <div
                class="mx-auto flex w-[150px] min-w-[150px] items-center justify-between rounded-xl border border-true-gray-500 p-1 text-true-gray-800"
              >
                <button
                  type="button"
                  aria-label="Diminuir {drink.name}"
                  class="{stepperClass} h-[40px] w-[40px]"
                  onclick={() =>
                    (quantityTexts[i] = step(quantityTexts[i], -1))}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="21"
                    height="20"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      fill="currentColor"
                      d="m7.181 9.999 6.531-6.801a.445.445 0 0 0-.008-.617l-1.168-1.196a.423.423 0 0 0-.605-.008L3.954 9.682a.408.408 0 0 0-.117.317.432.432 0 0 0 .117.316l7.977 8.309a.424.424 0 0 0 .606-.008l1.167-1.196a.445.445 0 0 0 .008-.617L7.181 10Z"
                    />
                  </svg>
                </button>
                <input
                  type="number"
                  inputmode="numeric"
                  min="0"
                  max="999"
                  placeholder="0"
                  aria-label={drink.name}
                  value={quantityTexts[i]}
                  oninput={e =>
                    (quantityTexts[i] = clampField(e.currentTarget))}
                  class="h-[40px] w-[60px] bg-transparent p-2 text-center text-sm font-bold text-water-50 focus:ring-0 focus:outline-hidden"
                />
                <button
                  type="button"
                  aria-label="Aumentar {drink.name}"
                  class="{stepperClass} h-[40px] w-[40px]"
                  onclick={() => (quantityTexts[i] = step(quantityTexts[i], 1))}
                >
                  <svg
                    width="21"
                    height="20"
                    viewBox="0 0 21 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M13.8189 9.99857L7.2877 3.19779C7.12364 3.02982 7.12754 2.75248 7.29551 2.5806L8.46348 1.38529C8.63145 1.21342 8.80488 1.20951 9.06895 1.37748L17.0455 9.68607C17.1314 9.77201 17.1705 9.8892 17.1627 10.0025C17.1666 10.1197 17.1275 10.2329 17.0455 10.3189L9.06895 18.6236C8.90488 18.7915 8.63145 18.7876 8.46348 18.6158L7.29551 17.4204C7.12754 17.2486 7.12364 16.9712 7.2877 16.8033L13.8189 9.99857Z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
              </div>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>
  <div
    class="flex flex-col gap-2 text-lg font-medium text-water-50 lg:flex-row lg:items-end lg:text-left"
  >
    <p class="lg:w-[350px]" aria-live="polite">
      Serão necessários aproximadamente
      <span class="font-bold">{formatKg(kg)}</span>
      kg de gelo.
    </p>
    <a
      href={orderLink(kg)}
      target="_blank"
      rel="noopener noreferrer"
      class="mx-auto block w-3/5 rounded-lg bg-true-blue-900 px-[14px] py-4 text-center duration-300 hover:bg-true-blue-700 lg:w-2/5"
    >
      Enviar pedido
    </a>
  </div>
</section>
