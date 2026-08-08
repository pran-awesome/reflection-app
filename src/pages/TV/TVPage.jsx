import { useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useCurrentSession } from '../../hooks/useCurrentSession';
import { usePages } from '../../hooks/usePages';
import { useParticipantCount } from '../../hooks/useParticipants';
import { useAnswers } from '../../hooks/useAnswers';
import { useFloatingQueue } from '../../hooks/useFloatingQueue';
import FloatingAnswers from '../../components/FloatingAnswers/FloatingAnswers';
import MindMapLines from '../../components/FloatingAnswers/MindMapLines';
import Spotlight from '../../components/FloatingAnswers/Spotlight';
import SlideTransition from '../../components/SlideTransition/SlideTransition';
import TextSlideshow from '../../components/TextSlideshow/TextSlideshow';
import { isAnswerPage, toFloatingItem } from '../../lib/answers';

function TvVideo({ page }) {
  const videoRef = useRef(null);
  const seekedForRef = useRef(null);

  useEffect(() => {
    seekedForRef.current = null;
  }, [page.id]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const videoState = page.videoState || {};
    if (videoState.playing) {
      if (seekedForRef.current !== page.id && videoState.startedAt?.toMillis) {
        const elapsed = (Date.now() - videoState.startedAt.toMillis()) / 1000;
        if (Number.isFinite(elapsed) && elapsed > 0) {
          el.currentTime = elapsed;
        }
        seekedForRef.current = page.id;
      }
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [page.id, page.videoState?.playing, page.videoState?.startedAt]);

  return (
    <div className="tv-video-wrap">
      <video ref={videoRef} src={page.content?.videoUrl} playsInline />
    </div>
  );
}

function QrJoinScreen({ participantCount }) {
  const joinUrl = `${window.location.origin}/join`;
  return (
    <div className="qr-screen">
      <p className="h2">สแกน QR เพื่อเข้าร่วมกิจกรรม</p>
      <div className="qr-card">
        <QRCodeSVG value={joinUrl} size={280} bgColor="#FFFCF7" fgColor="#3E2B22" />
      </div>
      <span className="badge badge-sage">เข้าร่วมแล้ว {participantCount} คน</span>
    </div>
  );
}

export default function TVPage() {
  const { sessionId, session, loading } = useCurrentSession();
  const { pages } = usePages(sessionId);
  const participantCount = useParticipantCount(sessionId);

  const currentPageIndex = session?.currentPageIndex ?? -1;
  const currentPage = currentPageIndex >= 0 ? pages[currentPageIndex] : null;
  const isQuestionPage = isAnswerPage(currentPage?.type);

  const { items: floatingItems, push: pushFloating } = useFloatingQueue(18, { layout: 'tv' });

  const answers = useAnswers(sessionId, isQuestionPage ? currentPage.id : null, {
    limitCount: 30,
    onAdded: (answer) => pushFloating(toFloatingItem(answer)),
  });

  if (loading) {
    return <div className="tv-stage" />;
  }

  if (!session || session.status === 'idle') {
    return (
      <div className="tv-stage">
        <SlideTransition slideKey="idle">
          <p className="h2">รอเริ่มงาน...</p>
        </SlideTransition>
      </div>
    );
  }

  if (session.status === 'ended') {
    return (
      <div className="tv-stage">
        <SlideTransition slideKey="ended">
          <p className="display-text" style={{ textAlign: 'center' }}>
            ขอบคุณที่เข้าร่วมกิจกรรม
          </p>
        </SlideTransition>
      </div>
    );
  }

  // status === 'presenting'
  if (!currentPage) {
    return (
      <div className="tv-stage">
        <SlideTransition slideKey="qr">
          <QrJoinScreen participantCount={participantCount} />
        </SlideTransition>
      </div>
    );
  }

  if (currentPage.type === 'video') {
    return (
      <div className="tv-stage">
        <SlideTransition slideKey={currentPage.id}>
          <TvVideo page={currentPage} />
        </SlideTransition>
      </div>
    );
  }

  if (currentPage.type === 'text_slideshow') {
    return (
      <div className="tv-stage">
        <SlideTransition slideKey={currentPage.id}>
          {currentPage.title && <p className="body-text tv-prompts-text tv-slideshow-title">{currentPage.title}</p>}
          <TextSlideshow page={currentPage} variant="tv" />
        </SlideTransition>
      </div>
    );
  }

  if (currentPage.type === 'message') {
    return (
      <div className="tv-stage">
        <SlideTransition slideKey={currentPage.id}>
          <p className="display-text tv-message-text">{currentPage.title}</p>
        </SlideTransition>
      </div>
    );
  }

  // question / split_question
  return (
    <div className="tv-stage">
      <div className="tv-topbar">
        <span className="badge badge-sage">เข้าร่วมแล้ว {participantCount} คน</span>
      </div>
      {/* Invisible keep-out zone so floating answers never cover the question */}
      <div className="tv-question-barrier" aria-hidden="true" />
      <SlideTransition slideKey={currentPage.id}>
        <div className="tv-question-block tv-question-block--hub">
          <p className="display-text tv-question-text">{currentPage.title}</p>
        </div>
      </SlideTransition>
      <MindMapLines items={floatingItems} />
      <Spotlight answers={answers} field="showOnTV" />
      <FloatingAnswers items={floatingItems} variant="tv" />
    </div>
  );
}
