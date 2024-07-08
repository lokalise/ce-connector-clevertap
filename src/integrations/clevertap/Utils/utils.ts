import { ClevertapTemplatesListItem } from '../client/clevertapApiTypes'

export const filterBaseEmailTempelates = (
  allTemplatesList: ClevertapTemplatesListItem[],
): ClevertapTemplatesListItem[] => {
  return allTemplatesList.filter((template: ClevertapTemplatesListItem) => {
    const templateName: string = template.templateName
    return !templateName.includes('__')
  })
}
