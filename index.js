import express from 'express'
import neo4j from 'neo4j-driver'

const PORT = 3000
const app = express()

const driver = neo4j.driver('bolt://localhost:7687', neo4j.auth.basic('neo4j', '12345678'))

const session = driver.session()

app.get('/', (req, res) => {
  res.send(
    `<ul><li><a href="/path">/path</a></li></ul>`
  )
})

app.get('/path', async (req, res) => {
  const { start, end } = req.query

  if (!start || !end) {
    res.send('Missing start or end parameter')
    return
  }

  try {
    const result = await session.run(
      `MATCH (start {name: $start}), (end {name: $end}),
             path = shortestPath((start)-[:WALK_TO*]-(end))
        RETURN path`,
      { start, end }
    )

    const records = result.records
    if (records.length === 0) {
      return res.status(404).json({ message: 'No path found between the given points.' })
    }

    const path = records[0].get('path')

    const nodes = path.segments.map((segment) => ({
      from: segment.start.properties.name,
      to: segment.end.properties.name,
      distance: segment.relationship.properties.distance,
    }))

    return res.json({ nodes })
  } catch (error) {
    console.error('Error querying Neo4j:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

app.listen(PORT, () => {
  console.log(`Server started on port http://localhost:${PORT}`)
})
