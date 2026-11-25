/**
 * YouTube Data API v3 client.
 * This reads public video metadata. It does not write to your YouTube account
 * and it does not alter YouTube's recommendation model.
 */
var YTFeedApi = (function () {
  "use strict";

  var BASE = "https://www.googleapis.com/youtube/v3";

  function queryString(params) {
    var parts = [];
    Object.keys(params).forEach(function (key) {
      if (params[key] === undefined || params[key] === null || params[key] === "") return;
      parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(params[key]));
    });
    return parts.join("&");
  }

  function request(path, params) {
    var url = BASE + path + "?" + queryString(params);
    return fetch(url).then(function (res) {
      return res.json().then(function (body) {
        if (!res.ok || body.error) {
          var message =
            (body.error && body.error.message) ||
            "YouTube API request failed (" + res.status + ")";
          throw new Error(message);
        }
        return body;
      });
    });
  }

  function searchVideos(apiKey, options) {
    return request("/search", {
      key: apiKey,
      part: "snippet",
      type: "video",
      maxResults: Math.min(options.maxResults || 50, 50),
      q: options.query,
      order: options.order || "relevance",
      safeSearch: "moderate",
      regionCode: options.regionCode,
      relevanceLanguage: options.relevanceLanguage,
      channelId: options.channelId,
      publishedAfter: options.publishedAfter,
      pageToken: options.pageToken
    }).then(function (data) {
      var videos = (data.items || [])
        .map(function (item) {
          if (!item.id || !item.id.videoId) return null;
          var id = item.id.videoId;
          var thumbs = (item.snippet && item.snippet.thumbnails) || {};
          return {
            videoId: id,
            title: item.snippet.title,
            description: item.snippet.description,
            channelId: item.snippet.channelId,
            channelTitle: item.snippet.channelTitle,
            publishedAt: item.snippet.publishedAt,
            thumbnail:
              (thumbs.high && thumbs.high.url) ||
              (thumbs.medium && thumbs.medium.url) ||
              "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg"
          };
        })
        .filter(Boolean);
      return {
        videos: videos,
        nextPageToken: data.nextPageToken || ""
      };
    });
  }

  function getVideoDetails(apiKey, videoIds) {
    if (!videoIds.length) return Promise.resolve([]);
    return request("/videos", {
      key: apiKey,
      part: "contentDetails,statistics,snippet",
      id: videoIds.join(",")
    }).then(function (data) {
      return (data.items || []).map(function (item) {
        var snippet = item.snippet || {};
        var thumbs = snippet.thumbnails || {};
        var stats = item.statistics || {};
        return {
          videoId: item.id,
          title: snippet.title,
          description: snippet.description,
          channelId: snippet.channelId,
          channelTitle: snippet.channelTitle,
          publishedAt: snippet.publishedAt,
          categoryId: snippet.categoryId || "",
          liveBroadcastContent: snippet.liveBroadcastContent || "none",
          tags: Array.isArray(snippet.tags) ? snippet.tags.slice(0, 15) : [],
          thumbnail:
            (thumbs.maxres && thumbs.maxres.url) ||
            (thumbs.high && thumbs.high.url) ||
            (thumbs.medium && thumbs.medium.url) ||
            "",
          duration: (item.contentDetails && item.contentDetails.duration) || "",
          viewCount: stats.viewCount ? Number(stats.viewCount) : 0,
          likeCount: stats.likeCount ? Number(stats.likeCount) : 0,
          commentCount: stats.commentCount ? Number(stats.commentCount) : 0
        };
      });
    });
  }

  function enrichVideos(apiKey, videos) {
    var chunks = [];
    var i;
    for (i = 0; i < videos.length; i += 50) {
      chunks.push(videos.slice(i, i + 50));
    }
    return Promise.all(
      chunks.map(function (chunk) {
        var ids = chunk.map(function (v) {
          return v.videoId;
        });
        return getVideoDetails(apiKey, ids);
      })
    ).then(function (groups) {
      var byId = {};
      groups.forEach(function (details) {
        details.forEach(function (d) {
          byId[d.videoId] = d;
        });
      });
      return videos
        .map(function (v) {
          var extra = byId[v.videoId];
          if (!extra) return Object.assign({}, v);
          var merged = Object.assign({}, v, extra);
          if (!merged.thumbnail) {
            merged.thumbnail = v.thumbnail || "https://i.ytimg.com/vi/" + v.videoId + "/hqdefault.jpg";
          }
          return merged;
        });
    });
  }

  function getChannelById(apiKey, channelId) {
    return request("/channels", {
      key: apiKey,
      part: "snippet",
      id: channelId
    }).then(function (data) {
      return (data.items || []).map(function (item) {
        var thumbs = (item.snippet && item.snippet.thumbnails) || {};
        return {
          channelId: item.id,
          title: item.snippet.title,
          description: item.snippet.description || "",
          thumbnail: (thumbs.default && thumbs.default.url) || ""
        };
      });
    });
  }

  function getChannelByHandle(apiKey, handle) {
    var clean = String(handle || "").replace(/^@/, "").trim();
    if (!clean) return Promise.resolve([]);
    return request("/channels", {
      key: apiKey,
      part: "snippet",
      forHandle: "@" + clean
    }).then(function (data) {
      return (data.items || []).map(function (item) {
        var thumbs = (item.snippet && item.snippet.thumbnails) || {};
        return {
          channelId: item.id,
          title: item.snippet.title,
          description: item.snippet.description || "",
          thumbnail: (thumbs.default && thumbs.default.url) || ""
        };
      });
    });
  }

  function searchChannels(apiKey, query) {
    return request("/search", {
      key: apiKey,
      part: "snippet",
      type: "channel",
      maxResults: 5,
      q: query
    }).then(function (data) {
      return (data.items || []).map(function (item) {
        return {
          channelId: item.snippet.channelId || (item.id && item.id.channelId),
          title: item.snippet.title,
          description: item.snippet.description,
          thumbnail:
            (item.snippet.thumbnails.default && item.snippet.thumbnails.default.url) || ""
        };
      });
    });
  }

  function extractChannelIdFromUrl(input) {
    if (!input) return "";
    var channelMatch = String(input).match(/youtube\.com\/channel\/(UC[\w-]+)/i);
    if (channelMatch) return channelMatch[1];
    var bare = String(input).trim();
    if (/^UC[\w-]{20,}$/.test(bare)) return bare;
    return "";
  }

  function extractChannelHandleFromUrl(input) {
    if (!input) return "";
    var urlMatch = String(input).match(/youtube\.com\/@([A-Za-z0-9_.-]+)/i);
    if (urlMatch) return urlMatch[1];
    var bare = String(input).trim();
    if (/^@[A-Za-z0-9_.-]+$/.test(bare)) return bare.slice(1);
    return "";
  }

  function decodeXml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&#(\d+);/g, function (_m, code) {
        return String.fromCharCode(parseInt(code, 10));
      });
  }

  function tagText(xml, tag) {
    var re = new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)<\\/" + tag + ">", "i");
    var m = xml.match(re);
    return m ? decodeXml(m[1].trim()) : "";
  }

  function parseRssFeed(xml) {
    var feedTitle = tagText(xml, "title");
    var entries = [];
    var entryRe = /<entry>([\s\S]*?)<\/entry>/gi;
    var match;
    while ((match = entryRe.exec(xml)) !== null) {
      var block = match[1];
      var videoId = tagText(block, "yt:videoId");
      if (!videoId) continue;
      var channelId = tagText(block, "yt:channelId");
      var title = tagText(block, "title");
      var authorBlock = block.match(/<author>([\s\S]*?)<\/author>/i);
      var channelTitle = (authorBlock ? tagText(authorBlock[1], "name") : "") || feedTitle;
      var publishedAt = tagText(block, "published");
      var description = tagText(block, "media:description");
      var viewsMatch = block.match(/<media:statistics[^>]*\bviews="(\d+)"/i);
      var thumbMatch = block.match(/<media:thumbnail[^>]*\burl="([^"]+)"/i);
      var ratingMatch = block.match(/<media:starRating[^>]*\baverage="([\d.]+)"[^>]*\bcount="(\d+)"/i);
      var linkMatch = block.match(/<link[^>]*\bhref="([^"]+)"/i);
      var href = linkMatch ? linkMatch[1] : "";
      if (href.indexOf("/shorts/") !== -1) continue;

      entries.push({
        videoId: videoId,
        title: title,
        description: description,
        channelId: channelId,
        channelTitle: channelTitle,
        publishedAt: publishedAt,
        thumbnail: thumbMatch ? decodeXml(thumbMatch[1]) : "https://i.ytimg.com/vi/" + videoId + "/hqdefault.jpg",
        duration: "",
        viewCount: viewsMatch ? Number(viewsMatch[1]) : 0,
        likeCount: ratingMatch ? Math.round(Number(ratingMatch[2]) * (Number(ratingMatch[1]) / 5)) : 0,
        isRssStarter: true
      });
    }
    return {
      channelTitle: feedTitle,
      videos: entries
    };
  }

  function fetchChannelRss(channelId) {
    var url = "https://www.youtube.com/feeds/videos.xml?channel_id=" + encodeURIComponent(channelId);
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error("RSS feed failed (" + res.status + ")");
      return res.text();
    }).then(parseRssFeed);
  }

  return {
    searchVideos: searchVideos,
    getVideoDetails: getVideoDetails,
    enrichVideos: enrichVideos,
    getChannelById: getChannelById,
    getChannelByHandle: getChannelByHandle,
    searchChannels: searchChannels,
    extractChannelIdFromUrl: extractChannelIdFromUrl,
    extractChannelHandleFromUrl: extractChannelHandleFromUrl,
    parseRssFeed: parseRssFeed,
    fetchChannelRss: fetchChannelRss
  };
})();
