import skeletonSheet from '../../sprites/skeletonsheet.png'
import AnimatedEnemy, { type EnemyAnimation } from './AnimateEnemy'


export default function Skeleton({ animation = 'idle', mirrored = true }: { animation?: EnemyAnimation; mirrored?: boolean }) {
    return <AnimatedEnemy sheet={skeletonSheet} frameSize={500} animation={animation} mirrored={mirrored} label="Skeleton" />   
}