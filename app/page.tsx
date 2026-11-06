import Link from 'next/link'

const destinations = [
  {
    href: '/skills',
    title: 'Skills',
    description: '扫描、整理和编辑本地 Skill。',
    mark: 'S',
  },
  {
    href: '/agents',
    title: 'Agents',
    description: '组合多个 Skill，并管理 Agent 测试。',
    mark: 'A',
  },
]

export default function HomePage() {
  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span>Skill Manager</span>
        </Link>
        <span className="local-badge"><span />本地工作区</span>
      </header>

      <section className="hero" aria-labelledby="welcome-title">
        <p className="eyebrow">PERSONAL SKILL WORKSPACE</p>
        <h1 id="welcome-title">让每个 Skill，<br />都井井有条。</h1>
        <p className="hero-copy">在一个本地工作区中发现、维护和编排你的 AI Skills。</p>
      </section>

      <section className="destination-grid" aria-label="工作区">
        {destinations.map((destination) => (
          <Link className="destination-card" href={destination.href} key={destination.href}>
            <span className="card-mark" aria-hidden="true">{destination.mark}</span>
            <span className="card-content">
              <span className="card-title">{destination.title}</span>
              <span className="card-description">{destination.description}</span>
            </span>
            <span className="card-arrow" aria-hidden="true">↗</span>
          </Link>
        ))}
      </section>

      <footer className="home-footer">数据保存在本机 · 无需登录</footer>
    </main>
  )
}
