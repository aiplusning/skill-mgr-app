import { ToolsSettings } from './_tools'
import { ProjectsSettings } from './_projects'
import { TagsSettings } from './_tags'

export default function SettingsPage() {
  return <div className="space-y-8">
    <header><h1 className="text-2xl font-semibold">设置</h1><p className="mt-1 text-sm text-slate-500">管理本地 Skill 的工具、项目和标签选项。</p></header>
    <ToolsSettings />
    <ProjectsSettings />
    <TagsSettings />
  </div>
}
