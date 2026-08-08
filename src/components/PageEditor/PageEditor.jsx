import { useState } from 'react';
import PageForm from './PageForm';
import { deletePage, newPageRef, reorderPages } from '../../services/pageService';
import { getSlideshowItemText } from '../../lib/slideshow';

const TYPE_LABELS = {
  question: 'คำถาม',
  split_question: 'คำถามสองช่อง',
  video: 'วิดีโอ',
  message: 'ข้อความ',
  text_slideshow: 'ข้อความต่อเนื่อง',
};

function pageListLabel(page) {
  if (page.title) return page.title;
  if (page.type === 'text_slideshow') return getSlideshowItemText(page.content?.items?.[0]) || '(ยังไม่มีข้อความ)';
  return '(ไม่มีข้อความ)';
}

export default function PageEditor({ ownerId, scope = 'sessions', pages, onChanged }) {
  const [addingType, setAddingType] = useState(null);
  const [newPageId, setNewPageId] = useState(null);
  const [editingPageId, setEditingPageId] = useState(null);

  function startAdding(type) {
    setNewPageId(newPageRef(ownerId, scope).id);
    setAddingType(type);
    setEditingPageId(null);
  }

  function cancelAdding() {
    setAddingType(null);
    setNewPageId(null);
  }

  async function notifyChanged() {
    if (onChanged) await onChanged();
  }

  async function handleMove(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= pages.length) return;
    const next = [...pages];
    [next[index], next[target]] = [next[target], next[index]];
    await reorderPages(
      ownerId,
      next.map((p) => p.id),
      scope
    );
    await notifyChanged();
  }

  async function handleDelete(pageId) {
    if (!window.confirm('ลบหน้านี้ใช่หรือไม่?')) return;
    await deletePage(ownerId, pageId, scope);
    await notifyChanged();
  }

  return (
    <div className="stack">
      {pages.length === 0 && <p className="body-small">ยังไม่มีหน้าเนื้อหา เพิ่มหน้าแรกได้เลย</p>}

      {pages.map((page, index) => (
        <div key={page.id}>
          <div className="row-between card">
            <div className="row" style={{ gap: 'var(--space-3)', minWidth: 0 }}>
              <span className="badge">{TYPE_LABELS[page.type] || page.type}</span>
              <span
                className="body-text"
                style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {pageListLabel(page)}
              </span>
            </div>
            <div className="row">
              <button className="btn-icon" onClick={() => handleMove(index, -1)} disabled={index === 0} aria-label="เลื่อนขึ้น">
                ↑
              </button>
              <button
                className="btn-icon"
                onClick={() => handleMove(index, 1)}
                disabled={index === pages.length - 1}
                aria-label="เลื่อนลง"
              >
                ↓
              </button>
              <button
                className="btn-icon"
                onClick={() => {
                  setEditingPageId(editingPageId === page.id ? null : page.id);
                  cancelAdding();
                }}
                aria-label="แก้ไข"
              >
                ✎
              </button>
              <button className="btn-icon" onClick={() => handleDelete(page.id)} aria-label="ลบ">
                ✕
              </button>
            </div>
          </div>
          {editingPageId === page.id && (
            <PageForm
              ownerId={ownerId}
              scope={scope}
              pageId={page.id}
              order={page.order}
              type={page.type}
              initialData={page}
              onSaved={async () => {
                setEditingPageId(null);
                await notifyChanged();
              }}
              onCancel={() => setEditingPageId(null)}
            />
          )}
        </div>
      ))}

      {addingType && (
        <PageForm
          ownerId={ownerId}
          scope={scope}
          pageId={newPageId}
          order={pages.length}
          type={addingType}
          initialData={null}
          onSaved={async () => {
            cancelAdding();
            await notifyChanged();
          }}
          onCancel={cancelAdding}
        />
      )}

      {!addingType && (
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => startAdding('question')}>
            + คำถาม
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => startAdding('split_question')}>
            + คำถามสองช่อง
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => startAdding('video')}>
            + วิดีโอ
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => startAdding('message')}>
            + ข้อความ
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => startAdding('text_slideshow')}>
            + ข้อความต่อเนื่อง
          </button>
        </div>
      )}
    </div>
  );
}
