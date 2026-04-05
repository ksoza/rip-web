'use client';
// components/legal/UserContentAgreement.tsx
// Legal User Content Agreement — DMCA Safe Harbor + Transformative Use
// Must be accepted before first creation (stored in Supabase profiles)
import { useState } from 'react';

interface Props {
  onAccept: () => void;
  onDecline: () => void;
}

export function UserContentAgreement({ onAccept, onDecline }: Props) {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [checked, setChecked] = useState(false);

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 20;
    if (atBottom) setScrolledToBottom(true);
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-bg2 border border-border rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rip/20 to-purple/20 border border-rip/30 flex items-center justify-center">
              <span className="text-xl">⚖️</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">User Content Agreement</h2>
              <p className="text-xs text-muted">Required before creating content on ReMixr</p>
            </div>
          </div>
        </div>

        {/* Scrollable Legal Content */}
        <div
          className="flex-1 overflow-y-auto px-6 py-4 text-sm text-muted leading-relaxed"
          onScroll={handleScroll}
        >
          <p className="text-white font-semibold mb-3">
            REMIXR USER CONTENT &amp; TRANSFORMATIVE WORKS AGREEMENT
          </p>
          <p className="text-xs text-muted/60 mb-4">Last updated: April 2026</p>

          <p className="mb-4">
            This User Content Agreement (&quot;Agreement&quot;) is a legally binding contract between you
            (&quot;User,&quot; &quot;you,&quot; or &quot;your&quot;) and Remix I.P. LLC d/b/a ReMixr (&quot;ReMixr,&quot;
            &quot;Platform,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) governing your creation, upload, and
            distribution of content through the ReMixr platform.
          </p>

          <p className="text-white font-semibold mb-2">1. NATURE OF CONTENT</p>
          <p className="mb-4">
            1.1. All content created on ReMixr constitutes <strong className="text-white">user-generated
            transformative fan works</strong> as recognized under the fair use doctrine of United States
            copyright law (17 U.S.C. § 107). Content is created by users for purposes of commentary,
            criticism, parody, education, and transformative creative expression.
          </p>
          <p className="mb-4">
            1.2. ReMixr is a creative tool and hosting platform. ReMixr does not create, direct, curate,
            or endorse any specific user-generated content. Users are solely responsible for the content
            they create using the Platform&apos;s tools.
          </p>
          <p className="mb-4">
            1.3. No content created on this Platform is affiliated with, endorsed by, sponsored by, or
            authorized by any original intellectual property holder, studio, network, publisher, or
            licensor unless explicitly stated otherwise.
          </p>

          <p className="text-white font-semibold mb-2">2. USER REPRESENTATIONS &amp; WARRANTIES</p>
          <p className="mb-2">By creating content on ReMixr, you represent and warrant that:</p>
          <p className="mb-1 pl-4">
            (a) Your content constitutes a <strong className="text-white">transformative work</strong> that
            adds new expression, meaning, or message to any referenced source material, making it a
            distinctly different creation altered through your own personal creative vision and artistic touch;
          </p>
          <p className="mb-1 pl-4">
            (b) Your content is created out of genuine <strong className="text-white">fan admiration and
            appreciation</strong> for the original intellectual property, and is not intended to serve as a
            market substitute for or to diminish the commercial value of any original work;
          </p>
          <p className="mb-1 pl-4">
            (c) You will not represent your content as official, canonical, or authorized by any
            original IP holder;
          </p>
          <p className="mb-1 pl-4">
            (d) You accept <strong className="text-white">sole responsibility</strong> for the content you
            create, including any legal consequences arising from your creations;
          </p>
          <p className="mb-4 pl-4">
            (e) You have the right to use any original material (your own images, voice recordings, etc.)
            that you upload to the Platform as inputs for content creation.
          </p>

          <p className="text-white font-semibold mb-2">3. DMCA COMPLIANCE &amp; SAFE HARBOR</p>
          <p className="mb-4">
            3.1. ReMixr operates as a &quot;service provider&quot; as defined under Section 512 of the Digital
            Millennium Copyright Act (DMCA). We maintain a registered DMCA agent and comply with all
            notice-and-takedown provisions required to maintain safe harbor protection.
          </p>
          <p className="mb-4">
            3.2. If an intellectual property holder believes that content on the Platform infringes their
            copyright, they may submit a DMCA takedown notice to our designated agent. Upon receipt of a
            valid notice, we will expeditiously remove or disable access to the allegedly infringing content.
          </p>
          <p className="mb-4">
            3.3. Users whose content is removed may file a counter-notification if they believe the
            removal was the result of a mistake or misidentification. ReMixr will process counter-notifications
            in accordance with 17 U.S.C. § 512(g).
          </p>
          <p className="mb-4">
            3.4. ReMixr maintains a policy of terminating accounts of users who are repeat infringers
            in accordance with 17 U.S.C. § 512(i).
          </p>

          <p className="text-white font-semibold mb-2">4. INDEMNIFICATION</p>
          <p className="mb-4">
            You agree to <strong className="text-white">indemnify, defend, and hold harmless</strong> ReMixr,
            its officers, directors, employees, agents, and affiliates from and against any and all claims,
            damages, obligations, losses, liabilities, costs, and expenses (including reasonable attorneys&apos;
            fees) arising from: (a) your use of the Platform; (b) content you create, upload, publish, or
            distribute through the Platform; (c) your violation of this Agreement; or (d) your violation
            of any third-party rights, including intellectual property rights.
          </p>

          <p className="text-white font-semibold mb-2">5. LIMITATION OF LIABILITY</p>
          <p className="mb-4">
            5.1. ReMixr provides AI-powered creative tools on an &quot;as-is&quot; basis. We do not guarantee
            that content created using our tools will qualify as fair use under any specific jurisdiction&apos;s
            laws. Fair use determinations are inherently fact-specific and made on a case-by-case basis.
          </p>
          <p className="mb-4">
            5.2. IN NO EVENT SHALL REMIXR BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
            OR PUNITIVE DAMAGES ARISING OUT OF OR RELATED TO YOUR USE OF THE PLATFORM OR ANY CONTENT
            CREATED THEREON, REGARDLESS OF THE THEORY OF LIABILITY.
          </p>

          <p className="text-white font-semibold mb-2">6. CONTENT MODERATION &amp; REMOVAL</p>
          <p className="mb-4">
            6.1. ReMixr reserves the right to remove any content that, in our sole judgment: (a) does not
            constitute a transformative work; (b) is a direct copy or near-reproduction of copyrighted
            material; (c) is used for commercial purposes that compete with the original IP; (d) violates
            applicable law; or (e) violates this Agreement or our Terms of Service.
          </p>
          <p className="mb-4">
            6.2. Users who repeatedly create non-transformative or infringing content may have their
            accounts suspended or terminated.
          </p>

          <p className="text-white font-semibold mb-2">7. NFT MINTING &amp; DISTRIBUTION</p>
          <p className="mb-4">
            7.1. When you mint content as a Non-Fungible Token (NFT), you represent that the minted work
            is your original transformative creation. You retain ownership of your transformative
            contribution while acknowledging that you do not own the underlying IP that inspired the work.
          </p>
          <p className="mb-4">
            7.2. NFTs minted on ReMixr represent ownership of the specific transformative digital creation,
            not any rights to the underlying source intellectual property.
          </p>

          <p className="text-white font-semibold mb-2">8. GOVERNING LAW &amp; DISPUTE RESOLUTION</p>
          <p className="mb-4">
            This Agreement shall be governed by the laws of the State of Delaware. Any disputes arising
            under this Agreement shall be resolved through binding arbitration administered by the
            American Arbitration Association, with the arbitration taking place in Delaware or remotely
            at the parties&apos; mutual election.
          </p>

          <p className="text-white font-semibold mb-2">9. MODIFICATIONS</p>
          <p className="mb-4">
            ReMixr reserves the right to modify this Agreement at any time. Material changes will be
            communicated to users via email or in-app notification. Continued use of the Platform after
            notification constitutes acceptance of the modified terms.
          </p>

          <p className="text-xs text-muted/40 mt-6">
            This agreement is designed to protect both the Platform and its users. We strongly encourage
            all users to create content that is genuinely transformative and that adds their own unique
            creative vision to any referenced material.
          </p>
        </div>

        {/* Footer with checkbox and buttons */}
        <div className="px-6 py-4 border-t border-border space-y-3">
          {!scrolledToBottom && (
            <p className="text-xs text-rip/80 text-center animate-pulse">
              ↓ Please scroll to read the full agreement
            </p>
          )}

          <label className={`flex items-start gap-3 cursor-pointer transition-opacity ${scrolledToBottom ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-border accent-rip"
              disabled={!scrolledToBottom}
            />
            <span className="text-xs text-muted leading-relaxed">
              I have read and agree to the User Content Agreement. I understand that I am solely
              responsible for the content I create and that my creations must constitute transformative
              fan works made out of genuine admiration.
            </span>
          </label>

          <div className="flex gap-3">
            <button
              onClick={onDecline}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-muted border border-border hover:bg-white/5 transition-colors"
            >
              Decline
            </button>
            <button
              onClick={onAccept}
              disabled={!checked}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: checked
                  ? 'linear-gradient(135deg, #ff2d78, #a855f7)'
                  : '#333',
              }}
            >
              I Agree — Let&apos;s Create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
