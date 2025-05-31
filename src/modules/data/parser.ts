import type { StoryData } from '../../types';

export function parseJsonData(inputElement: HTMLTextAreaElement): StoryData {
  let data: any;
  try {
    data = JSON.parse(inputElement.value);
  } catch (e: any) {
    throw new Error(`JSON解析エラー: ${e.message}`);
  }
  
  const requiredKeys = ['persons', 'locations', 'acts', 'events', 'initialStates'];
  for (const key of requiredKeys) {
    if (!data[key]) throw new Error(`必須キーなし: ${key}`);
  }
  
  const optionalKeys = ['props', 'informations', 'moves', 'stays'];
  optionalKeys.forEach(key => {
    if (data[key] && !Array.isArray(data[key])) {
      throw new Error(`キー "${key}" は配列必須`);
    }
    if (!data[key]) data[key] = [];
  });
  
  return data as StoryData;
}