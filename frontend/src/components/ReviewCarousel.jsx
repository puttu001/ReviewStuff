import { useEffect, useMemo, useRef, useState } from 'react';
import {
  animate,
  motion,
  useMotionValue,
  useTransform,
} from 'motion/react';
import { ExternalLinkIcon } from './Icons';
import RemoteImage from './RemoteImage';
import SiteIcon from './SiteIcon';
import InstagramEmbed from './InstagramEmbed';
import { displayTitle, hostname, siteLabel } from '../utils/format';
import { instagramPostUrl } from '../utils/instagram';

function carouselConfig(width) {
  if (width < 390) {
    return {
      sensitivity: 180,
      xMultiplier: 42,
      yMultiplier: 15,
      rotationMultiplier: 5,
      scaleReduction: 0.07,
    };
  }

  return {
    sensitivity: 220,
    xMultiplier: 54,
    yMultiplier: 18,
    rotationMultiplier: 6,
    scaleReduction: 0.08,
  };
}

function wrapIndex(index, total) {
  return ((index % total) + total) % total;
}

export default function ReviewCarousel({ items, activeIndex, onActiveIndexChange }) {
  const progress = useMotionValue(activeIndex);
  const startProgress = useRef(activeIndex);
  const activeAnimation = useRef(null);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === 'undefined' ? 390 : window.innerWidth,
  );

  const total = items.length;
  const config = useMemo(() => carouselConfig(viewportWidth), [viewportWidth]);

  useEffect(() => {
    function handleResize() {
      setViewportWidth(window.innerWidth);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function moveTo(target) {
    activeAnimation.current?.stop();
    activeAnimation.current = animate(progress, target, {
      type: 'spring',
      stiffness: 220,
      damping: 28,
      mass: 0.9,
      onComplete: () => onActiveIndexChange(wrapIndex(target, total)),
    });
  }

  function handleDragEnd(_, info) {
    const shift =
      Math.abs(info.offset.x) >= 50 ? (info.offset.x < 0 ? 1 : -1) : 0;
    moveTo(startProgress.current + shift);
  }

  const activeItem = items[activeIndex];
  const activeHasLink = Boolean(activeItem && hostname(activeItem.content));
  const activeHasEmbed = Boolean(activeItem && instagramPostUrl(activeItem.content));

  return (
    <section
      className="review-carousel"
      aria-roledescription="carousel"
      aria-label="Items to review"
    >
      <div className={`review-carousel__stack ${activeHasEmbed ? 'review-carousel__stack--embed' : ''}`}>
        <motion.div
          className={`review-carousel__drag-surface ${activeHasEmbed ? 'review-carousel__drag-surface--embed' : ''}`}
          drag={total > 1 ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0}
          dragMomentum={false}
          onDragStart={() => {
            activeAnimation.current?.stop();
            startProgress.current = Math.round(progress.get());
            progress.set(startProgress.current);
          }}
          onDrag={(_, info) => {
            const dragProgress = Math.max(
              -0.85,
              Math.min(0.85, -info.offset.x / config.sensitivity),
            );
            progress.set(startProgress.current + dragProgress);
          }}
          onDragEnd={handleDragEnd}
          onKeyDown={(event) => {
            if (total <= 1) return;
            if (event.key === 'ArrowLeft') {
              event.preventDefault();
              startProgress.current = Math.round(progress.get());
              moveTo(startProgress.current - 1);
            }
            if (event.key === 'ArrowRight') {
              event.preventDefault();
              startProgress.current = Math.round(progress.get());
              moveTo(startProgress.current + 1);
            }
          }}
          tabIndex={total > 1 ? 0 : -1}
          aria-label={
            total > 1
              ? 'Drag sideways or use the arrow keys to browse review cards'
              : 'Review card'
          }
        />

        {items.map((item, index) => (
          <ReviewCard
            key={item.id}
            item={item}
            index={index}
            isActive={index === activeIndex}
            total={total}
            progress={progress}
            config={config}
          />
        ))}

        {activeHasLink && (
          <a
            className="review-carousel__open"
            href={activeItem.content}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${displayTitle(activeItem)}`}
          >
            <ExternalLinkIcon width={17} height={17} />
            Open
          </a>
        )}
      </div>

      {total > 1 && (
        <div className="review-carousel__pagination" aria-label="Carousel position">
          {activeHasEmbed && (
            <button
              type="button"
              className="review-carousel__browse"
              aria-label="Previous review item"
              onClick={() => moveTo(Math.round(progress.get()) - 1)}
            >
              Previous
            </button>
          )}
          {items.map((item, index) => (
            <span
              key={item.id}
              className={`review-carousel__page ${
                index === activeIndex ? 'review-carousel__page--active' : ''
              }`}
              aria-hidden="true"
            />
          ))}
          {activeHasEmbed ? (
            <button
              type="button"
              className="review-carousel__browse"
              aria-label="Next review item"
              onClick={() => moveTo(Math.round(progress.get()) + 1)}
            >
              Next
            </button>
          ) : (
            <span className="review-carousel__hint">Swipe to browse</span>
          )}
        </div>
      )}
    </section>
  );
}

function ReviewCard({ item, index, isActive, total, progress, config }) {
  const offset = useTransform(progress, (value) => {
    let difference = (index - value) % total;
    if (difference > total / 2) difference -= total;
    if (difference < -total / 2) difference += total;
    return difference;
  });
  const x = useTransform(offset, (value) => value * config.xMultiplier);
  const rotate = useTransform(offset, (value) =>
    Math.abs(value) < 0.05 ? 0 : value * config.rotationMultiplier,
  );
  const y = useTransform(offset, (value) =>
    Math.abs(value) < 0.05 ? 0 : Math.abs(value) * config.yMultiplier,
  );
  const scale = useTransform(
    offset,
    (value) => 1 - Math.abs(value) * config.scaleReduction,
  );
  const opacity = useTransform(offset, (value) =>
    Math.max(0, 1 - Math.max(0, Math.abs(value) - 1.5) * 2),
  );
  const zIndex = useTransform(offset, (value) =>
    Math.round(100 - Math.abs(value) * 10),
  );
  const shadeOpacity = useTransform(offset, [-1, 0, 1], [0.36, 0, 0.36]);
  const copyOpacity = useTransform(offset, [-0.55, 0, 0.55], [0, 1, 0]);
  const host = hostname(item.content);
  const embedUrl = instagramPostUrl(item.content);
  const showEmbed = isActive && Boolean(embedUrl);

  return (
    <motion.article
      className={`review-carousel__card ${
        item.fetched_image ? '' : 'review-carousel__card--no-image'
      } ${showEmbed ? 'review-carousel__card--embed' : ''}`}
      style={{ x, rotate, y, scale, opacity, zIndex }}
      aria-hidden={!isActive}
    >
      {showEmbed ? (
        <>
          <div className="review-carousel__embed-heading">
            <SiteIcon className="review-carousel__favicon" url={item.content} />
            <div className="review-carousel__embed-label">
              <h1>{item.title?.trim() || 'Instagram post'}</h1>
              <p>{item.topic || 'Uncategorized'}</p>
            </div>
          </div>
          <div className="review-carousel__embed-body">
            <InstagramEmbed key={embedUrl} url={embedUrl} />
          </div>
        </>
      ) : (
        <>
          {item.fetched_image && (
            <RemoteImage
              className="review-carousel__image"
              src={item.fetched_image}
              alt=""
            />
          )}

          <div className="review-carousel__glow" />
          <div className="review-carousel__gradient" />
          <motion.div className="review-carousel__shade" style={{ opacity: shadeOpacity }} />

          <motion.div className="review-carousel__topic" style={{ opacity: copyOpacity }}>
            {item.topic || 'Uncategorized'}
          </motion.div>

          <motion.div className="review-carousel__copy" style={{ opacity: copyOpacity }}>
            <h1 className="review-carousel__title">{displayTitle(item)}</h1>
            <p className="review-carousel__source">
              {host ? (
                <>
                  <SiteIcon
                    className="review-carousel__favicon"
                    src={item.fetched_favicon}
                    url={item.content}
                  />
                  {siteLabel(item)}
                </>
              ) : (
                'Note'
              )}
            </p>
          </motion.div>
        </>
      )}
    </motion.article>
  );
}
