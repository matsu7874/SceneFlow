import { StoryData } from '../types/StoryData'

interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export function validateStoryData(data: any): ValidationResult {
  const errors: string[] = []

  // 必須フィールドのチェック
  const requiredFields = ['persons', 'locations', 'acts', 'events']
  for (const field of requiredFields) {
    if (!data[field] || !Array.isArray(data[field])) {
      errors.push(`${field}は必須フィールドで、配列である必要があります`)
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors }
  }

  // Personsの検証
  if (data.persons.length === 0) {
    errors.push('少なくとも1人の登場人物が必要です')
  } else {
    data.persons.forEach((person: any, index: number) => {
      if (!person.id || !person.name) {
        errors.push(`persons[${index}]: idとnameは必須です`)
      }
    })
  }

  // Locationsの検証
  if (data.locations.length === 0) {
    errors.push('少なくとも1つの場所が必要です')
  } else {
    data.locations.forEach((location: any, index: number) => {
      if (!location.id || !location.name) {
        errors.push(`locations[${index}]: idとnameは必須です`)
      }
    })
  }

  // Initial Statesの検証
  if (data.initialStates && Array.isArray(data.initialStates)) {
    const personIds = new Set(data.persons.map((p: any) => p.id))
    const locationIds = new Set(data.locations.map((l: any) => l.id))
    
    data.initialStates.forEach((state: any, index: number) => {
      if (!personIds.has(state.personId)) {
        errors.push(`initialStates[${index}]: 存在しないpersonId: ${state.personId}`)
      }
      if (!locationIds.has(state.locationId)) {
        errors.push(`initialStates[${index}]: 存在しないlocationId: ${state.locationId}`)
      }
    })
  }

  // Actsの検証
  const personIds = new Set(data.persons.map((p: any) => p.id))
  const locationIds = new Set(data.locations.map((l: any) => l.id))
  const propIds = new Set(data.props?.map((p: any) => p.id) || [])
  const infoIds = new Set(data.informations?.map((i: any) => i.id) || [])

  data.acts.forEach((act: any, index: number) => {
    if (!act.id || !act.personId || !act.locationId || !act.time || !act.description) {
      errors.push(`acts[${index}]: id, personId, locationId, time, descriptionは必須です`)
    }
    if (!personIds.has(act.personId)) {
      errors.push(`acts[${index}]: 存在しないpersonId: ${act.personId}`)
    }
    if (!locationIds.has(act.locationId)) {
      errors.push(`acts[${index}]: 存在しないlocationId: ${act.locationId}`)
    }
    if (act.propId && !propIds.has(act.propId)) {
      errors.push(`acts[${index}]: 存在しないpropId: ${act.propId}`)
    }
    if (act.informationId && !infoIds.has(act.informationId)) {
      errors.push(`acts[${index}]: 存在しないinformationId: ${act.informationId}`)
    }
    if (act.interactedPersonId && !personIds.has(act.interactedPersonId)) {
      errors.push(`acts[${index}]: 存在しないinteractedPersonId: ${act.interactedPersonId}`)
    }
  })

  // Eventsの検証
  const actIds = new Set(data.acts.map((a: any) => a.id))
  
  data.events.forEach((event: any, index: number) => {
    if (!event.id || !event.triggerType || !event.triggerValue || !event.eventTime || !event.personId || !event.actId) {
      errors.push(`events[${index}]: すべてのフィールドは必須です`)
    }
    if (!personIds.has(event.personId)) {
      errors.push(`events[${index}]: 存在しないpersonId: ${event.personId}`)
    }
    if (!actIds.has(event.actId)) {
      errors.push(`events[${index}]: 存在しないactId: ${event.actId}`)
    }
  })

  return {
    isValid: errors.length === 0,
    errors
  }
}