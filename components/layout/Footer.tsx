'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith('/messages')) {
    return null;
  }

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="col-span-1">
            <div className="flex items-center space-x-3 mb-4 ml-4">
              <img
                src="/animecom-logo.png"
                alt="AniWorld"
                className="h-14 w-auto sm:h-16"
              />
              <span className="text-xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
                AniWorld
              </span>
            </div>
            <p className="text-gray-600 text-sm">
              アニメ好き同士で感想を共有し、<br />
              新しい出会いを見つけよう
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">サイト</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-gray-600 hover:text-pink-600 transition-colors">
                  ホーム
                </Link>
              </li>
              <li>
                <Link href="/animes" className="text-gray-600 hover:text-pink-600 transition-colors">
                  アニメ一覧
                </Link>
              </li>
              <li>
                <Link href="/reviews" className="text-gray-600 hover:text-pink-600 transition-colors">
                  感想一覧
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">サポート</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="text-gray-600 hover:text-pink-600 transition-colors">
                  このサイトについて
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-600 hover:text-pink-600 transition-colors">
                  お問い合わせ
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-8 pt-6 text-center">
          <p className="text-sm text-gray-600">
            © 2026 AniWorld. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
