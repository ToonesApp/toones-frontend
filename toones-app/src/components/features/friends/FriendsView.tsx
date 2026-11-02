import { useSearchParams } from 'react-router-dom'
import { FriendsPanel } from './FriendsPanel'

/** The Friends page from the menu. */
export function FriendsView() {
  const [params] = useSearchParams()
  return (
    <>
      <div className="feed-head">
        <h1>Friends</h1>
      </div>
      <FriendsPanel initialTab={params.get('tab') === 'followers' ? 'followers' : 'following'} />
    </>
  )
}
