import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Folder } from 'lucide-react'
import { Database } from '@/lib/supabase'
import SongCard from './SongCard'

type Folder = Database['public']['Tables']['folders']['Row']
type Song = Database['public']['Tables']['songs']['Row']

interface FolderCardProps {
  folder: Folder
  songs: Song[]
  onSongUpdated: (song: Song) => void
  onSongDeleted: (songId: string) => void
  onFolderDeleted: (folderId: string) => void
  onStartPractice: (song: Song) => void
}

export default function FolderCard({ 
  folder, 
  songs, 
  onSongUpdated, 
  onSongDeleted: _onSongDeleted, 
  onStartPractice 
}: FolderCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Folder className="h-5 w-5" style={{ color: folder.color }} />
          <span>{folder.name}</span>
          <span className="text-sm text-gray-500">({songs.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {songs.map(song => (
          <div key={song.id} className="border rounded-lg p-3">
            <SongCard
              song={song}
              onSelect={onSongUpdated}
              onEdit={onSongUpdated}
              onStartPractice={onStartPractice}
            />
          </div>
        ))}
        {songs.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">
            No songs in this folder
          </p>
        )}
      </CardContent>
    </Card>
  )
}