import React from 'react';
import { Suit } from '@/types/tile';

interface MahjongTileProps {
    suit: Suit;
    rank: number; // 1-9
    width?: number;
    height?: number;
    className?: string;
}

export const MahjongTile: React.FC<MahjongTileProps> = ({
    suit,
    rank,
    width = 48,
    height = 64,
    className = ''
}) => {
    // Validate rank is in valid range (1-9)
    if (rank < 1 || rank > 9) {
        console.error(`[MahjongTile] Invalid rank: ${rank} for suit: ${suit}. Rank must be between 1-9.`);
        return (
            <div
                className={`relative inline-block select-none ${className} bg-red-100 border-2 border-red-500 flex items-center justify-center`}
                style={{ width, height }}
                title={`Invalid tile: ${suit} ${rank}`}
            >
                <span className="text-red-700 text-xs font-bold">Invalid</span>
            </div>
        );
    }

    // Colors
    const COLORS = {
        RED: '#d62828',
        GREEN: '#2d6a4f',
        BLUE: '#1e40af',
        BLACK: '#1f2937',
        WHITE: '#ffffff',
        CREAM: '#fdfbf7', // Tile face background
        BACK: '#e5e7eb',  // Tile body/shadow
    };

    // Helper to render the tile base (3D effect)
    const renderBase = () => (
        <>
            {/* Shadow/Side */}
            <rect x="4" y="6" width="100%" height="100%" rx="4" fill="#9ca3af" />
            <rect x="2" y="4" width="100%" height="100%" rx="4" fill="#e5e7eb" />
            {/* Face */}
            <rect x="0" y="0" width="100%" height="100%" rx="4" fill={COLORS.CREAM} stroke="#d1d5db" strokeWidth="1" />
        </>
    );

    // --- SUIT RENDERERS ---

    // 1. TONG (Circles)
    const renderTong = (rank: number) => {
        const circle = (cx: number, cy: number, r: number, fill: string, stroke: string = 'none') => (
            <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth="1" />
        );

        // Flower pattern for 1 Tong
        const renderFlower = (cx: number, cy: number, r: number, color: string) => (
            <g>
                <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="2" />
                <circle cx={cx} cy={cy} r={r * 0.4} fill={color} />
                {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                    <circle
                        key={i}
                        cx={cx + r * 0.7 * Math.cos((angle * Math.PI) / 180)}
                        cy={cy + r * 0.7 * Math.sin((angle * Math.PI) / 180)}
                        r={r * 0.15}
                        fill={color}
                    />
                ))}
            </g>
        );

        switch (rank) {
            case 1:
                return renderFlower(50, 50, 35, COLORS.GREEN); // Large pancake
            case 2:
                return (
                    <>
                        {circle(50, 25, 18, COLORS.GREEN)}
                        {circle(50, 75, 18, COLORS.BLUE)}
                    </>
                );
            case 3:
                return (
                    <>
                        {circle(20, 20, 14, COLORS.BLUE)}
                        {circle(50, 50, 14, COLORS.RED)}
                        {circle(80, 80, 14, COLORS.GREEN)}
                    </>
                );
            case 4:
                return (
                    <>
                        {circle(30, 25, 16, COLORS.BLUE)}
                        {circle(70, 25, 16, COLORS.GREEN)}
                        {circle(30, 75, 16, COLORS.GREEN)}
                        {circle(70, 75, 16, COLORS.BLUE)}
                    </>
                );
            case 5:
                return (
                    <>
                        {circle(25, 25, 12, COLORS.BLUE)}
                        {circle(75, 25, 12, COLORS.GREEN)}
                        {circle(50, 50, 12, COLORS.RED)}
                        {circle(25, 75, 12, COLORS.GREEN)}
                        {circle(75, 75, 12, COLORS.BLUE)}
                    </>
                );
            case 6:
                return (
                    <>
                        {circle(30, 20, 12, COLORS.GREEN)}
                        {circle(70, 20, 12, COLORS.GREEN)}
                        {circle(30, 50, 12, COLORS.RED)}
                        {circle(70, 50, 12, COLORS.RED)}
                        {circle(30, 80, 12, COLORS.RED)}
                        {circle(70, 80, 12, COLORS.RED)}
                    </>
                );
            case 7:
                return (
                    <>
                        {circle(20, 18, 10, COLORS.GREEN)}
                        {circle(50, 25, 10, COLORS.GREEN)}
                        {circle(80, 32, 10, COLORS.GREEN)}
                        {circle(30, 60, 12, COLORS.RED)}
                        {circle(70, 60, 12, COLORS.RED)}
                        {circle(30, 85, 12, COLORS.RED)}
                        {circle(70, 85, 12, COLORS.RED)}
                    </>
                );
            case 8:
                return (
                    <>
                        {circle(30, 20, 10, COLORS.BLUE)}
                        {circle(70, 20, 10, COLORS.BLUE)}
                        {circle(30, 40, 10, COLORS.BLUE)}
                        {circle(70, 40, 10, COLORS.BLUE)}
                        {circle(30, 60, 10, COLORS.BLUE)}
                        {circle(70, 60, 10, COLORS.BLUE)}
                        {circle(30, 80, 10, COLORS.BLUE)}
                        {circle(70, 80, 10, COLORS.BLUE)}
                    </>
                );
            case 9:
                return (
                    <>
                        {circle(20, 20, 12, COLORS.GREEN)}
                        {circle(50, 20, 12, COLORS.GREEN)}
                        {circle(80, 20, 12, COLORS.GREEN)}
                        {circle(20, 50, 12, COLORS.RED)}
                        {circle(50, 50, 12, COLORS.RED)}
                        {circle(80, 50, 12, COLORS.RED)}
                        {circle(20, 80, 12, COLORS.BLUE)}
                        {circle(50, 80, 12, COLORS.BLUE)}
                        {circle(80, 80, 12, COLORS.BLUE)}
                    </>
                );
            default:
                return null;
        }
    };

    // 2. SUO (Bamboo)
    const renderSuo = (rank: number) => {
        const bamboo = (x: number, y: number, len: number, color: string, rotate: number = 0) => (
            <g transform={`rotate(${rotate} ${x} ${y})`}>
                <rect x={x - 3} y={y - len / 2} width="6" height={len} rx="2" fill={color} />
                <line x1={x - 3} y1={y} x2={x + 3} y2={y} stroke="white" strokeWidth="1" />
            </g>
        );

        switch (rank) {
            case 1: // The Bird (Peacock/Sparrow)
                return (
                    <g transform="translate(50, 55) scale(0.8)">
                        {/* Body */}
                        <path d="M0,-20 Q15,-30 25,-10 Q30,10 10,25 Q-10,30 -25,15 Q-30,-5 -10,-15 Z" fill={COLORS.GREEN} />
                        {/* Head */}
                        <circle cx="-10" cy="-25" r="10" fill={COLORS.GREEN} />
                        <circle cx="-8" cy="-27" r="2" fill="white" /> {/* Eye */}
                        <path d="M-18,-25 L-25,-22 L-18,-18 Z" fill="#fbbf24" /> {/* Beak */}
                        {/* Tail */}
                        <path d="M10,20 Q20,40 40,35 Q30,20 20,15 Z" fill={COLORS.RED} />
                        <path d="M5,25 Q0,45 -20,40 Q-10,25 0,20 Z" fill={COLORS.RED} />
                    </g>
                );
            case 2:
                return (
                    <>
                        {bamboo(50, 25, 30, COLORS.GREEN)}
                        {bamboo(50, 75, 30, COLORS.BLUE)}
                    </>
                );
            case 3:
                return (
                    <>
                        {bamboo(25, 75, 30, COLORS.GREEN)}
                        {bamboo(50, 25, 30, COLORS.RED)}
                        {bamboo(75, 75, 30, COLORS.BLUE)}
                    </>
                );
            case 4:
                return (
                    <>
                        {bamboo(30, 25, 30, COLORS.GREEN)}
                        {bamboo(70, 25, 30, COLORS.GREEN)}
                        {bamboo(30, 75, 30, COLORS.BLUE)}
                        {bamboo(70, 75, 30, COLORS.BLUE)}
                    </>
                );
            case 5:
                return (
                    <>
                        {bamboo(20, 25, 30, COLORS.GREEN)}
                        {bamboo(80, 25, 30, COLORS.BLUE)}
                        {bamboo(50, 50, 30, COLORS.RED)}
                        {bamboo(20, 75, 30, COLORS.BLUE)}
                        {bamboo(80, 75, 30, COLORS.GREEN)}
                    </>
                );
            case 6:
                return (
                    <>
                        {bamboo(30, 25, 30, COLORS.GREEN)}
                        {bamboo(50, 25, 30, COLORS.GREEN)}
                        {bamboo(70, 25, 30, COLORS.GREEN)}
                        {bamboo(30, 75, 30, COLORS.BLUE)}
                        {bamboo(50, 75, 30, COLORS.BLUE)}
                        {bamboo(70, 75, 30, COLORS.BLUE)}
                    </>
                );
            case 7:
                return (
                    <>
                        {bamboo(50, 15, 25, COLORS.RED)}
                        {bamboo(30, 45, 25, COLORS.GREEN)}
                        {bamboo(50, 45, 25, COLORS.GREEN)}
                        {bamboo(70, 45, 25, COLORS.GREEN)}
                        {bamboo(30, 80, 25, COLORS.BLUE)}
                        {bamboo(50, 80, 25, COLORS.BLUE)}
                        {bamboo(70, 80, 25, COLORS.BLUE)}
                    </>
                );
            case 8:
                return (
                    <>
                        <g transform="translate(0, -5)">
                            {bamboo(25, 25, 25, COLORS.GREEN)}
                            {bamboo(50, 25, 25, COLORS.GREEN)}
                            {bamboo(75, 25, 25, COLORS.GREEN)}
                            {bamboo(35, 50, 25, COLORS.RED, 45)}
                            {bamboo(65, 50, 25, COLORS.RED, -45)}
                            {bamboo(25, 75, 25, COLORS.BLUE)}
                            {bamboo(50, 75, 25, COLORS.BLUE)}
                            {bamboo(75, 75, 25, COLORS.BLUE)}
                        </g>
                    </>
                );
            case 9:
                return (
                    <>
                        {bamboo(20, 25, 25, COLORS.RED)}
                        {bamboo(50, 25, 25, COLORS.BLUE)}
                        {bamboo(80, 25, 25, COLORS.GREEN)}
                        {bamboo(20, 50, 25, COLORS.RED)}
                        {bamboo(50, 50, 25, COLORS.BLUE)}
                        {bamboo(80, 50, 25, COLORS.GREEN)}
                        {bamboo(20, 75, 25, COLORS.RED)}
                        {bamboo(50, 75, 25, COLORS.BLUE)}
                        {bamboo(80, 75, 25, COLORS.GREEN)}
                    </>
                );
            default:
                return null;
        }
    };

    // 3. WAN (Characters)
    const renderWan = (rank: number) => {
        const chineseNumbers = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
        const numberChar = chineseNumbers[rank - 1];

        return (
            <g textAnchor="middle" fontFamily="KaiTi, STKaiti, serif" fontWeight="bold">
                <text x="50" y="40" fontSize="40" fill={COLORS.RED}>{numberChar}</text>
                <text x="50" y="85" fontSize="40" fill={COLORS.RED}>萬</text>
            </g>
        );
    };

    // Main render logic
    const renderContent = () => {
        // Suit is now a Suit enum, but handle as string for switch compatibility
        switch (suit) {
            case Suit.TONG:
                return renderTong(rank);
            case Suit.TIAO:
                return renderSuo(rank);
            case Suit.WAN:
                return renderWan(rank);
            default:
                // This should never happen with proper typing, but keep as fallback
                console.error(`[MahjongTile] Unknown suit: ${suit}`);
                return (
                    <text x="50" y="60" textAnchor="middle" fontSize="30" fill={COLORS.BLACK}>
                        {suit}{rank}
                    </text>
                );
        }
    };

    return (
        <div
            className={`relative inline-block select-none ${className}`}
            style={{ width, height }}
        >
            <svg
                viewBox="0 0 100 100"
                width="100%"
                height="100%"
                preserveAspectRatio="xMidYMid meet"
                style={{ filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.3))' }}
            >
                {renderBase()}
                {renderContent()}
            </svg>
        </div>
    );
};
