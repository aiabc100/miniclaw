---
id: weather
name: 天气查询
version: 1.0.0
description: 查询指定城市的实时天气信息
author: 系统管理员
tags: [天气, 查询, 实时]
createdAt: 2024-01-01
updatedAt: 2024-01-15
---

# 天气查询技能

查询指定城市的实时天气信息，包括温度、湿度、天气状况等。

## 参数定义

```json
{
  "city": {
    "type": "string",
    "description": "城市名称，如'北京'、'上海'、'广州'",
    "required": true
  }
}
```

## 示例

```json
[
  {
    "input": {
      "city": "北京"
    },
    "output": {
      "condition": "晴",
      "temperature": "25",
      "humidity": "45",
      "windSpeed": "12"
    },
    "description": "查询北京天气"
  }
]
```

## 实现代码

```typescript
async function execute(params, context) {
  const { city } = params;
  const startTime = Date.now();

  try {
    const response = await fetch(
      `https://wttr.in/${encodeURIComponent(city)}?format=j1&lang=zh`
    );

    if (!response.ok) {
      throw new Error(`无法获取 ${city} 的天气信息`);
    }

    const data = await response.json();
    const current = data.current_condition[0];

    const result = {
      city: city,
      condition: current.lang_zh[0].value,
      temperature: current.temp_C,
      feelsLike: current.FeelsLikeC,
      humidity: current.humidity,
      windSpeed: current.windspeedKmph,
      windDirection: current.winddir16Point,
      visibility: current.visibility
    };

    return {
      success: true,
      data: result,
      message: `${city} 当前天气：${result.condition}，温度 ${result.temperature}°C，湿度 ${result.humidity}%`,
      executionTime: Date.now() - startTime
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '查询天气失败',
      executionTime: Date.now() - startTime
    };
  }
}
```

## API 说明

本工具使用 [wttr.in](https://wttr.in) 免费 API，无需 API Key。

### API 端点

```
https://wttr.in/{city}?format=j1&lang=zh
```

### 参数说明

| 参数 | 说明 |
|-----|------|
| `city` | 城市名称（支持中文） |
| `format=j1` | 返回 JSON 格式 |
| `lang=zh` | 返回中文天气描述 |

## 扩展建议

1. **添加天气预报**：修改 API 参数获取未来几天天气
2. **添加天气预警**：解析返回数据中的预警信息
3. **缓存机制**：避免频繁请求同一城市
4. **多城市对比**：支持同时查询多个城市天气
