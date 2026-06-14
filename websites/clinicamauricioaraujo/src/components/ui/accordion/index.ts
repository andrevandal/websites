import Accordion from "./Accordion.astro"
import AccordionContent from "./AccordionContent.astro"
import AccordionItem from "./AccordionItem.astro"
import AccordionTrigger from "./AccordionTrigger.astro"

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger }

// oxlint-disable-next-line import/no-anonymous-default-export
export default {
  Root: Accordion,
  Content: AccordionContent,
  Item: AccordionItem,
  Trigger: AccordionTrigger,
}
