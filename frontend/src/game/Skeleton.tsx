import skeletonSheet from '../../sprites/skeletonsheet.png'
import AnimatedEnemy, { type EnemyAnimation } from './AnimateEnemy'


export default function Skeleton({ animation = 'idle', mirrored = true, size }: { animation?: EnemyAnimation; mirrored?: boolean; size?: string }) {
    return <AnimatedEnemy sheet={skeletonSheet} frameSize={500} animation={animation} mirrored={mirrored} label="Skeleton" size={size} />
}
