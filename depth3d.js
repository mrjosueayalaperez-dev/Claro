/* depth3d.js — self-contained, silent 3D depth / parallax renderer for <canvas>.
   No dependencies, no network, no audio, no credentials.
   Usage:
     Depth3D.enabled = true;
     Depth3D.render(ctx, function(offCtx){ ...draw your flat frame... }, timeMs);
   The flat frame is drawn to an offscreen canvas, then composited onto ctx
   with a drifting perspective tilt, layered parallax particles, a depth
   shadow and a vignette. Because it draws onto the same canvas, anything
   captured via canvas.captureStream()/MediaRecorder includes the effect.
   This is a procedural visual effect only — it does not generate scenes. */
(function(root){
  var off = null, stars = null;
  function rand(i){ var x = Math.sin(i * 9301 + 49297) * 233280; return x - Math.floor(x); }
  function ensure(W, H){
    if (!off || off.width !== W || off.height !== H){
      off = document.createElement("canvas"); off.width = W; off.height = H;
    }
    if (!stars){
      stars = [];
      for (var i = 0; i < 90; i++) stars.push({ x: rand(i), y: rand(i + 500), z: 0.2 + rand(i + 900) * 0.8 });
    }
    return off.getContext("2d");
  }
  var D = {
    enabled: false,
    strength: 1,            // 0..2 intensity
    render: function(ctx, drawFlat, t){
      var W = ctx.canvas.width, H = ctx.canvas.height;
      if (!D.enabled){ drawFlat(ctx); return; }
      var o = ensure(W, H);
      o.setTransform(1, 0, 0, 1, 0, 0); o.globalAlpha = 1; o.clearRect(0, 0, W, H);
      drawFlat(o);
      var s = D.strength, k = (t || 0) / 1000;
      var ax = Math.sin(k * 0.9) * 0.06 * s, ay = Math.cos(k * 0.7) * 0.04 * s;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
      // back layer: blurred, enlarged copy of the frame (far plane)
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 0.55;
      try { ctx.filter = "blur(18px)"; } catch (e) {}
      ctx.drawImage(off, -W * 0.1 - ax * W, -H * 0.1 - ay * H, W * 1.2, H * 1.2);
      try { ctx.filter = "none"; } catch (e) {}
      // mid layer: parallax particles at varying depth
      for (var i = 0; i < stars.length; i++){
        var p = stars[i];
        var x = ((p.x + ax * p.z * 3 + k * 0.01 * p.z) % 1 + 1) % 1 * W;
        var y = ((p.y + ay * p.z * 3) % 1 + 1) % 1 * H;
        ctx.globalAlpha = 0.15 + p.z * 0.45;
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(x, y, 1 + p.z * 3, 0, Math.PI * 2); ctx.fill();
      }
      // front layer: the frame on a tilted card (pseudo-perspective via skew/scale)
      ctx.globalAlpha = 1;
      ctx.translate(W / 2, H / 2);
      ctx.transform(1 - Math.abs(ax) * 0.6, ay * 0.5, ax * 0.5, 1 - Math.abs(ay) * 0.6, 0, 0);
      var sc = 0.9;
      ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 40;
      ctx.shadowOffsetX = -ax * 300; ctx.shadowOffsetY = 20 - ay * 300;
      ctx.drawImage(off, -W * sc / 2, -H * sc / 2, W * sc, H * sc);
      ctx.shadowColor = "transparent";
      // specular sheen that moves with the tilt
      var g = ctx.createLinearGradient(-W / 2 + ax * W * 4, -H / 2, W / 2 + ax * W * 4, H / 2);
      g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.5, "rgba(255,255,255,0.08)"); g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g; ctx.fillRect(-W * sc / 2, -H * sc / 2, W * sc, H * sc);
      ctx.restore();
    }
  };
  root.Depth3D = D;
})(typeof window !== "undefined" ? window : this);
