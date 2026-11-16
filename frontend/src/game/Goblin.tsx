import goblinSheet from '../../sprites/goblinsheet.png'
import AnimatedEnemy, { type EnemyAnimation } from './AnimateEnemy'


export default function Goblin({ animation = 'idle', mirrored = true, size }: { animation?: EnemyAnimation; mirrored?: boolean; size?: string }) {
    return <AnimatedEnemy sheet={goblinSheet} frameSize={500} animation={animation} mirrored={mirrored} label="Goblin" size={size} />
}
