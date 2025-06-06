import React, { useState } from 'react'
import { StoryData } from '../types/StoryData'
import { validateStoryData } from '../utils/validation'
import { useVisualFeedback } from '../contexts/VisualFeedbackContext'
import './JsonDataInput.css'

interface JsonDataInputProps {
  onDataLoad: (data: StoryData) => void
  currentData?: StoryData | null
}

const defaultJsonData = {
  persons: [
    {
      id: 1,
      name: '桃太郎',
      color: '#ff69b4',
      description: '桃から生まれた勇敢な少年',
      age: 15,
      occupation: '鬼退治の勇者',
      personality: '勇敢で正義感が強い',
      goals: ['鬼を退治する', '村の平和を守る'],
      relationships: [
        { targetId: '2', type: '養親' },
        { targetId: '3', type: '養親' },
        { targetId: '4', type: '仲間' },
        { targetId: '5', type: '仲間' },
        { targetId: '6', type: '仲間' },
      ],
    },
    {
      id: 2,
      name: 'おじいさん',
      color: '#8b4513',
      description: '山で柴刈りをする優しい老人',
      age: 70,
      occupation: '樵（きこり）',
      relationships: [
        { targetId: '1', type: '養子' },
        { targetId: '3', type: '夫婦' },
      ],
    },
    {
      id: 3,
      name: 'おばあさん',
      color: '#da70d6',
      description: '川で洗濯をする心優しい老婆',
      age: 68,
      occupation: '主婦',
      relationships: [
        { targetId: '1', type: '養子' },
        { targetId: '2', type: '夫婦' },
      ],
    },
    {
      id: 4,
      name: '犬',
      color: '#d2691e',
      description: '最初に仲間になった忠実な犬',
      relationships: [
        { targetId: '1', type: '主人' },
        { targetId: '5', type: '仲間' },
        { targetId: '6', type: '仲間' },
      ],
    },
    {
      id: 5,
      name: '猿',
      color: '#ff8c00',
      description: '賢く機敏な猿',
      relationships: [
        { targetId: '1', type: '主人' },
        { targetId: '4', type: '仲間' },
        { targetId: '6', type: '仲間' },
      ],
    },
    {
      id: 6,
      name: 'キジ',
      color: '#4169e1',
      description: '鬼ヶ島から逃げてきた元偵察鳥',
      occupation: '元鬼ヶ島の偵察鳥',
      personality: '用心深いが正義感が強い',
      goals: ['鬼の支配を終わらせる', '自由を取り戻す'],
      relationships: [
        { targetId: '1', type: '主人' },
        { targetId: '4', type: '仲間' },
        { targetId: '5', type: '仲間' },
        { targetId: '7', type: '元雇い主' },
      ],
    },
    {
      id: 7,
      name: '鬼の大将',
      color: '#dc143c',
      description: '鬼ヶ島を支配する恐ろしい鬼',
      occupation: '鬼ヶ島の首領',
      relationships: [
        { targetId: '1', type: '敵対' },
      ],
    },
  ],
  locations: [
    { id: 101, name: '桃太郎の家', connections: [102], description: 'おじいさんとおばあさんと暮らす温かい家' },
    { id: 102, name: '村の広場', connections: [101, 103, 104, 109], description: '村人が集まる中心地' },
    { id: 103, name: '村はずれの道', connections: [102, 105], description: '鬼ヶ島へ向かう道の始まり' },
    { id: 104, name: '川辺', connections: [102], description: 'おばあさんが洗濯をしていた川' },
    { id: 105, name: '峠道', connections: [103, 106, 109], description: '動物たちと出会う山道' },
    { id: 106, name: '海岸', connections: [105, 107], description: '鬼ヶ島が見える海辺' },
    { id: 107, name: '鬼ヶ島', connections: [106, 108], description: '海に浮かぶ恐ろしい島' },
    { id: 108, name: '鬼の城', connections: [107], description: '鬼たちが住む要塞' },
    { id: 109, name: '山の中', connections: [102, 105], description: 'おじいさんが柴刈りをする山' },
  ],
  props: [
    { id: 201, name: 'きびだんご', description: '特別な力を与える不思議なだんご', category: 'CONSUMABLE', isPortable: true, isConsumable: true },
    { id: 202, name: '桃', description: '川から流れてきた大きな桃', category: 'SPECIAL', isPortable: false },
    { id: 203, name: '宝物', description: '鬼が奪った村の宝物', category: 'VALUABLE', isPortable: true },
    { id: 204, name: '刀', description: '桃太郎の武器', category: 'WEAPON', isPortable: true },
    { id: 205, name: '鬼の金棒', description: '鬼の大将の武器', category: 'WEAPON', isPortable: true },
    { id: 206, name: '柴', description: 'おじいさんが集めた薪', category: 'TOOL', isPortable: true },
    { id: 207, name: '鬼ヶ島の地図', description: 'キジが持っていた島の詳細な地図', category: 'INFORMATION', isPortable: true },
  ],
  informations: [
    { id: 301, content: '鬼ヶ島の場所', description: '海の向こうにある鬼の住む島' },
    { id: 302, content: 'きびだんごの効果', description: '食べると力が湧いてくる' },
    { id: 303, content: '鬼の弱点', description: '団結した力には勝てない' },
    { id: 304, content: '犬の秘密', description: '実は村の食べ物を盗んでいた' },
    { id: 305, content: 'キジの過去', description: '鬼ヶ島の偵察鳥だった' },
    { id: 306, content: '鬼の計画', description: '村を支配しようとしている' },
  ],
  initialStates: [
    { personId: 1, locationId: 104, time: '00:00:00' },
    { personId: 2, locationId: 109, time: '00:00:00' },
    { personId: 3, locationId: 104, time: '00:00:00' },
    { personId: 4, locationId: 109, time: '00:00:00' },
    { personId: 5, locationId: 105, time: '00:00:00' },
    { personId: 6, locationId: 107, time: '00:00:00' },
    { personId: 7, locationId: 108, time: '00:00:00' },
  ],
  acts: [
    // 序章：桃太郎誕生とそれぞれの朝
    { id: 1000, personId: 3, locationId: 104, time: '00:00:00', description: '川で洗濯をしている' },
    { id: 1001, personId: 2, locationId: 109, time: '00:00:00', description: '山で柴刈りを始める', propId: 206 },
    { id: 1002, personId: 4, locationId: 109, time: '00:00:00', description: '村の食料を探している', informationId: 304 },
    { id: 1003, personId: 6, locationId: 107, time: '00:00:00', description: '鬼ヶ島から脱走を試みる', informationId: 305 },
    { id: 1004, personId: 7, locationId: 108, time: '00:00:00', description: '村への侵攻計画を練る', informationId: 306 },

    // 桃太郎誕生
    { id: 1005, personId: 3, locationId: 104, time: '00:05:00', description: '大きな桃を見つける', propId: 202 },
    { id: 1006, personId: 1, locationId: 104, time: '00:05:00', description: '桃から生まれる', propId: 202 },
    { id: 1007, personId: 2, locationId: 109, time: '00:05:00', description: '犬と遭遇し、柴を取られそうになる', interactedPersonId: 4, propId: 206 },
    { id: 1008, personId: 4, locationId: 109, time: '00:05:00', description: 'おじいさんの柴を奪おうとする', interactedPersonId: 2 },

    // 家への帰還
    { id: 1009, personId: 3, locationId: 101, time: '00:10:00', description: '桃太郎を家に連れて帰る', interactedPersonId: 1 },
    { id: 1010, personId: 1, locationId: 101, time: '00:10:00', description: 'おばあさんと一緒に家に着く' },
    { id: 1011, personId: 2, locationId: 109, time: '00:10:00', description: '犬を追い払い、山を下りる' },
    { id: 1012, personId: 4, locationId: 105, time: '00:10:00', description: '峠道へ逃げる' },
    { id: 1013, personId: 6, locationId: 105, time: '00:10:00', description: '脱走に成功し、峠道に到着', propId: 207 },

    // 桃太郎との出会い
    { id: 1014, personId: 2, locationId: 101, time: '00:15:00', description: '家に戻り、桃太郎と出会う', interactedPersonId: 1 },
    { id: 1015, personId: 1, locationId: 101, time: '00:15:00', description: 'おじいさんと初めて会う', interactedPersonId: 2 },
    { id: 1016, personId: 5, locationId: 105, time: '00:15:00', description: '峠道で食べ物を探す' },

    // 決意と準備
    { id: 1017, personId: 1, locationId: 101, time: '00:20:00', description: '鬼退治の決意を語る' },
    { id: 1018, personId: 2, locationId: 101, time: '00:20:00', description: '犬との出来事を話す', informationId: 304 },
    { id: 1019, personId: 7, locationId: 108, time: '00:20:00', description: 'キジの脱走に気づき激怒する' },

    { id: 1020, personId: 2, locationId: 101, time: '00:25:00', description: 'きびだんごを作る', propId: 201 },
    { id: 1021, personId: 3, locationId: 101, time: '00:25:00', description: 'きびだんご作りを手伝う' },

    // 出発準備
    { id: 1022, personId: 1, locationId: 101, time: '00:30:00', description: '出発の準備をする', propId: 201 },
    { id: 1023, personId: 4, locationId: 105, time: '00:30:00', description: '空腹で苦しんでいる' },
    { id: 1024, personId: 6, locationId: 105, time: '00:30:00', description: '鬼の追っ手を警戒している' },

    { id: 1025, personId: 2, locationId: 101, time: '00:35:00', description: '桃太郎にきびだんごを渡す', interactedPersonId: 1, propId: 201 },
    { id: 1026, personId: 3, locationId: 101, time: '00:35:00', description: '桃太郎を見送る', interactedPersonId: 1 },

    // 旅の始まり
    { id: 1027, personId: 1, locationId: 102, time: '00:40:00', description: '村の広場を通る' },
    { id: 1028, personId: 1, locationId: 103, time: '00:50:00', description: '村はずれへ向かう' },

    // 仲間との出会い
    { id: 1029, personId: 1, locationId: 105, time: '01:00:00', description: '峠道で飢えた犬と出会う', interactedPersonId: 4 },
    { id: 1030, personId: 4, locationId: 105, time: '01:00:00', description: '桃太郎に過去を告白し、きびだんごをもらって改心する', interactedPersonId: 1, propId: 201, informationId: 304 },

    { id: 1031, personId: 1, locationId: 105, time: '01:10:00', description: '猿と出会う', interactedPersonId: 5 },
    { id: 1032, personId: 5, locationId: 105, time: '01:10:00', description: 'きびだんごをもらって仲間になる', interactedPersonId: 1, propId: 201 },

    { id: 1033, personId: 1, locationId: 105, time: '01:20:00', description: 'キジと出会い、鬼ヶ島の情報を得る', interactedPersonId: 6, propId: 207 },
    { id: 1034, personId: 6, locationId: 105, time: '01:20:00', description: '元鬼の偵察鳥として情報を提供し、きびだんごをもらって仲間になる', interactedPersonId: 1, propId: 201, informationId: 305 },

    // 海岸への到着
    { id: 1035, personId: 1, locationId: 106, time: '01:30:00', description: '海岸に到着する' },
    { id: 1036, personId: 4, locationId: 106, time: '01:30:00', description: '海岸に到着する' },
    { id: 1037, personId: 5, locationId: 106, time: '01:30:00', description: '海岸に到着する' },
    { id: 1038, personId: 6, locationId: 106, time: '01:30:00', description: '海岸に到着し、島への道を案内する' },

    // 鬼ヶ島上陸
    { id: 1039, personId: 1, locationId: 107, time: '02:00:00', description: '船で鬼ヶ島に上陸する', informationId: 301 },
    { id: 1040, personId: 4, locationId: 107, time: '02:00:00', description: '鬼ヶ島に上陸する' },
    { id: 1041, personId: 5, locationId: 107, time: '02:00:00', description: '鬼ヶ島に上陸する' },
    { id: 1042, personId: 6, locationId: 107, time: '02:00:00', description: '秘密の入口を案内する', propId: 207 },

    // 最終決戦
    { id: 1043, personId: 1, locationId: 108, time: '02:30:00', description: '鬼の城に到着する' },
    { id: 1044, personId: 4, locationId: 108, time: '02:30:00', description: '門番の鬼と戦う' },
    { id: 1045, personId: 5, locationId: 108, time: '02:30:00', description: '城壁を登る' },
    { id: 1046, personId: 6, locationId: 108, time: '02:30:00', description: '空から鬼の城を攻撃する' },

    { id: 1047, personId: 7, locationId: 108, time: '02:40:00', description: '桃太郎たちと対峙する', interactedPersonId: 1 },
    { id: 1048, personId: 1, locationId: 108, time: '03:00:00', description: '鬼の大将を倒す', interactedPersonId: 7, informationId: 303 },
    { id: 1049, personId: 1, locationId: 108, time: '03:10:00', description: '宝物を取り戻す', propId: 203 },

    // 凱旋
    { id: 1050, personId: 1, locationId: 101, time: '04:30:00', description: '村に凱旋する', propId: 203 },
    { id: 1051, personId: 2, locationId: 101, time: '04:30:00', description: '桃太郎の帰還を喜ぶ', interactedPersonId: 1 },
    { id: 1052, personId: 3, locationId: 101, time: '04:30:00', description: '桃太郎を抱きしめる', interactedPersonId: 1 },
    { id: 1053, personId: 4, locationId: 101, time: '04:30:00', description: '村人に謝罪し、受け入れられる' },
    { id: 1054, personId: 5, locationId: 101, time: '04:30:00', description: '村の英雄として歓迎される' },
    { id: 1055, personId: 6, locationId: 101, time: '04:30:00', description: '自由の身となり、村で暮らすことを決める' },
  ],
}

export const JsonDataInput: React.FC<JsonDataInputProps> = ({ onDataLoad, currentData }) => {
  const [jsonText, setJsonText] = useState(JSON.stringify(defaultJsonData, null, 2))
  const [error, setError] = useState<string | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(true)
  const { showNotification } = useVisualFeedback()

  // Update JSON text when currentData changes
  React.useEffect(() => {
    if (currentData) {
      setJsonText(JSON.stringify(currentData, null, 2))
    }
  }, [currentData, JSON.stringify(currentData)])

  const handleLoadData = (): void => {
    try {
      const data = JSON.parse(jsonText) as StoryData
      const validationResult = validateStoryData(data)

      if (validationResult.isValid) {
        setError(null)
        onDataLoad(data)
        showNotification('データが正常にロードされました', { type: 'success' })
      } else {
        setError(validationResult.errors.join('\n'))
        showNotification('データの検証に失敗しました', { type: 'error' })
      }
    } catch (e) {
      setError(`JSONの解析に失敗しました: ${e instanceof Error ? e.message : 'Unknown error'}`)
      showNotification('JSONの解析に失敗しました', { type: 'error' })
    }
  }

  return (
    <div className="json-data-input">
      <details open={isDetailsOpen} onToggle={(e) => setIsDetailsOpen(e.currentTarget.open)}>
        <summary>
          <h2>物語データ (JSON)</h2>
        </summary>
        <div className="input-content">
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder="ここにJSON形式の物語データを入力してください..."
          />
          <button onClick={handleLoadData}>物語データをロード</button>
          {error && (
            <div className="error-output">
              {error}
            </div>
          )}
        </div>
      </details>
    </div>
  )
}